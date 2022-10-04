import * as fs from 'fs';
import * as path from 'path';
import {Command} from 'commander';
import * as lineReader from 'line-reader';
import {PATTERNS} from './const';
import { parse } from 'date-format-parse';
import humanizeDuration from 'humanize-duration';
import * as Promise from "bluebird";


interface BuilderTask {
  label: string,
  start?: Date,
  end?: Date,
  duration?: number
}

let builderMap = new Map<string, BuilderTask>();

function bm(input :BuilderTask) {
  if (builderMap.has(input.label)) {
    var ref = builderMap.get(input.label);
    if (input.start) {
      ref.start = input.start;
    }
    if (input.end) {
      ref.end = input.end;
    }
    builderMap.set(input.label,ref);
  } else {
    builderMap.set(input.label, input);
  }
}

function calculateDuration() {
  builderMap.forEach(function (value, key, map) {
    const end: Date = value.end || new Date();
    value.duration = Math.abs(end.getTime() - value.start.getTime());
    map.set(key, value);
  });
}


// const append = Promise.promisify(bm);
const append = bm;

const prog = new Command();

prog.name('modelt-loganalyzer').description('scripts analyses model-t logs').argument('<filepath>', 'filepath to log file downloaded from CCv2 cloud portal').version("1.0.0");
prog.parse();
const args = prog.args;


var eachLine = Promise.promisify(lineReader.eachLine);

args.forEach(element => {
  if (fs.existsSync(element)) {
    console.log(`Start log analysis: ${element}`)
    eachLine(element, function(line) {
      if(line.includes(PATTERNS.BUILDER_START)) {
        if (PATTERNS.TS_PATTERN_RE.test(line)) {
          const ts = PATTERNS.TS_PATTERN_RE.exec(line)[0];
        }
      }
      if( line.includes(PATTERNS.GIT_CLONER_START)) {
        if (PATTERNS.TS_PATTERN_RE.test(line)) {
          const ts = PATTERNS.TS_PATTERN_RE.exec(line)[0];
        }
      }

      if( line.includes(PATTERNS.BUILDER_TASK_START)) {
        if (PATTERNS.TS_PATTERN_RE.test(line)) {
          const ts = PATTERNS.TS_PATTERN_RE.exec(line)[0];
          const startDate = parse(ts, PATTERNS.TS_PATTERN_SYM);
          let taskName = line.substring(line.lastIndexOf(PATTERNS.BUILDER_TASK_START)).replace(PATTERNS.BUILDER_TASK_START, "").trim();
          append({label: taskName, start: startDate});
        }
      }

      if( line.includes(PATTERNS.BUILDER_TASK_END)) {
        if (PATTERNS.TS_PATTERN_RE.test(line)) {
          const ts = PATTERNS.TS_PATTERN_RE.exec(line)[0];
          const endDate = parse(ts, PATTERNS.TS_PATTERN_SYM);
          let taskName = line.substring(line.lastIndexOf(PATTERNS.BUILDER_TASK_END)).replace(PATTERNS.BUILDER_TASK_END, "").trim();
          append({label: taskName, end: endDate});

        }
      }
    }).then(function() {
      calculateDuration();
      console.log(`#task,start,end,duration,duration_str`);
      builderMap.forEach(function(value) {
        console.log(`${value.label};${value.start.getTime()};${value.end.getTime()};${value.duration};${humanizeDuration(value.duration)}`);
      })
      // console.log(builderMap);
    });
  } else {
    console.error(`File "${element}" doesn't exist`);
  }
});
