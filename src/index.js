/* eslint-disable no-process-exit */
import { Observable } from 'rx';
import nodemailer from 'nodemailer';
import ses from 'nodemailer-ses-transporter';
import dotenv from 'dotenv';
import emails from 'emails.json';
import data from 'data.json';

dotenv.load();

const options = {
  accessKeyId: process.env.access_key,
  secretAccessKey: process.env.priv_key,
  rateLimit: 10000
};

const mailOptions = {
  from: 'You <team@freecodecamp.com>',
  subject: data.subject,
  text: data.text
};

const transporter = nodemailer.createTransport(ses(options));
const send$ = Observable.fromNodeback(transporter.sendMail, transporter);

Observable.from(emails)
  // batch every 10000
  .bufferWithCount(10000)
  // wait 1 sec between batches
  .delay(1000)
  .flatMap(emails => {
    const filledOptions = Object.assign(
      {},
      mailOptions,
      { emails: emails.join(', ').replace(/,$/, '') }
    );
    return send$(filledOptions);
  })
  .count()
  .subscribe(
    count => console.log('sent %d so far', count),
    err => { throw err; },
    () => {
      console.log('process complete');
      process.exit(0);
    }
  );
