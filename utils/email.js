// eslint-disable-next-line import/no-extraneous-dependencies
const { convert } = require('html-to-text');
const nodemailer = require('nodemailer');
const pug = require('pug');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Osman Inayat <${process.env.EMAIL_FROM}>`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      // Brevo
      return nodemailer.createTransport({
        host: process.env.BREVO_SMTP_SERVER,
        port: process.env.BREVO_SMTP_PORT,
        auth: {
          user: process.env.BREVO_SMTP_LOGIN,
          pass: process.env.BREVO_PASSWORD,
        },
      });
    }

    // Development - Use MailTrap
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }

  // Send the actual email
  async send(template, subject) {
    try {
      // 1) Render HTML based on a pug template
      const html = pug.renderFile(
        `${__dirname}/../views/email/${template}.pug`,
        {
          firstName: this.firstName,
          url: this.url,
          subject,
          order: this.order,
        },
      );

      // 2) Define email options
      const mailOptions = {
        from: this.from,
        to: this.to,
        subject,
        html,
        text: convert(html),
      };

      await this.newTransport().sendMail(mailOptions);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error sending email:', error);
      throw error;
    }
  }

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

    // Create friendly status names for subject
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
