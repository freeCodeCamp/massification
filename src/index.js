/* eslint-disable no-process-exit */
import _ from 'lodash';
import { Observable, Scheduler } from 'rx';
import { isEmail } from 'validator';
import nodemailer from 'nodemailer';
import ses from 'nodemailer-ses-transport';
import dotenv from 'dotenv';
import data from '../data.json';
import { argv } from 'yargs';

dotenv.load();

let emails;
if (argv._[0] === '-p') {
  emails = require('../test-emails.json');
} else {
  emails = require('../emails.json');
}

const maxRate = 90;
const options = {
  accessKeyId: process.env.access_key,
  secretAccessKey: process.env.priv_key,
  rateLimit: maxRate
};

const mailOptions = {
  from: 'Quincy <Quincy@FreeCodeCamp.com>',
  subject: data.subject
};

const createText = _.template(data.text);
const transporter = nodemailer.createTransport(ses(options));
const send$ = Observable.fromNodeCallback(transporter.sendMail, transporter);
const emailLength = emails.length;
let counter = 0;

const startTime = Date.now();
let endTime;
let lastEmail;
function getPercent(val) {
  const percent = (val / emailLength) * 100;
  return Math.round(percent * 100) / 100;
}

const email$ = Observable.from(emails, null, null, Scheduler.default)
  .filter(email => isEmail(email))
  .controlled();

let bufferCount = 0;
email$
  .flatMap(email => {
    const filledOptions = Object.assign(
      {},
      mailOptions,
      {
        to: email,
        text: createText({ email })
      }
    );
    return send$(filledOptions)
      .catch(e => {
        console.log('encountered an error sending to %s', email, e.message);
        return Observable.just(false);
      });
  })
  .doOnNext(info => {
    bufferCount += 1;
    counter += 1;
    if (bufferCount >= maxRate) {
      bufferCount = 0;
      email$.request(maxRate);
    }
    lastEmail = info && info.envelope ? info.envelope.to : lastEmail;
    console.log('%d percent done', getPercent(counter));
  })
  .count()
  .doOnNext(() => (endTime = Date.now()))
  .subscribe(
    count => console.log(
      'sent %d emails in %d ms',
      count,
      endTime - startTime
    ),
    err => {
      console.log('err on last email %s', lastEmail);
      throw err;
    },
    () => {
      console.log('process complete');
      console.log('last email sent to %s', lastEmail);
      process.exit(0);
    }
  );

email$.request(maxRate);
