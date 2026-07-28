// eslint-disable-next-line import/no-extraneous-dependencies
const { convert } = require('html-to-text');
const nodemailer = require('nodemailer');
const pug = require('pug');
const brevo = require('../config/brevo');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`;
  }

  // Dev only — Mailtrap SMTP, unchanged
  newTransport() {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Render pug template to HTML — shared by both paths
  renderTemplate(template, subject) {
    return pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
      order: this.order,
    });
  }

  async sendViaBrevoApi(html, subject) {
    const sendSmtpEmail = {
      sender: {
        name: process.env.EMAIL_FROM_NAME,
        email: process.env.EMAIL_FROM,
      },
      to: [{ email: this.to }],
      subject,
      htmlContent: html,
      textContent: convert(html),
    };

    await brevo.sendTransacEmail(sendSmtpEmail);
  }

  async sendViaMailtrap(html, subject) {
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: convert(html),
    };

    await this.newTransport().sendMail(mailOptions);
  }

  // Send the actual email
  async send(template, subject) {
    try {
      const html = this.renderTemplate(template, subject);

      if (process.env.NODE_ENV === 'production') {
        await this.sendViaBrevoApi(html, subject);
      } else {
        await this.sendViaMailtrap(html, subject);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending email:', error);
      throw error;
    }
  }

  // All methods below are completely unchanged
  async sendWelcome() {
    await this.send('welcome', 'Welcome to the Exclusive Family!');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for only 10 minutes)',
    );
  }

  async sendOrderConfirmation(order) {
    this.order = order;
    await this.send(
      'orderConfirmation',
      `Order Confirmation - Order #${order.orderNumber}`,
    );
  }

  async sendOrderStatusUpdate(order, oldStatus) {
    this.order = order;
    this.oldStatus = oldStatus;

    const statusNames = {
      processing: 'Processing',
      confirmed: 'Confirmed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };

    const newStatusName = statusNames[order.orderStatus] || order.orderStatus;

    await this.send(
      'orderStatusUpdate',
      `Order Update: Your Order is Now ${newStatusName} - #${order.orderNumber}`,
    );
  }
};
