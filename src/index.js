/* eslint-disable no-process-exit */
import _ from 'lodash';
import { Observable, Scheduler } from 'rx';
import { isEmail } from 'validator';
import nodemailer from 'nodemailer';
import ses from 'nodemailer-ses-transport';
import dotenv from 'dotenv';
import emails from '../emails.json';
import data from '../data.json';

dotenv.load();

const options = {
  accessKeyId: process.env.access_key,
  secretAccessKey: process.env.priv_key,
  rateLimit: 10000
};

const mailOptions = {
  from: 'Quincy <team@freecodecamp.com>',
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

Observable.from(emails, null, null, Scheduler.default)
  .filter(email => isEmail(email))
  .flatMap(email => {
    const filledOptions = Object.assign(
      {},
      mailOptions,
      {
        to: email,
        text: createText({ email })
      }
    );
    return send$(filledOptions);
  })
  .doOnNext(email => {
    lastEmail = email;
    counter += 1;
    console.log('%d percent done', getPercent(counter));
  })
  .count()
  .doOnNext(() => endTime = Date.now())
  .subscribe(
    count => console.log(
      'sent %d emails in %d seconds',
      count,
      endTime - startTime
    ),
    err => {
      console.log('err on last email %s', lastEmail);
      throw err;
    },
    () => {
      console.log('process complete');
      process.exit(0);
    }
  );
