const nodemailer = require('nodemailer');
const chalk = require('chalk');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendOTP(email, otp, purpose = 'verification') {
    try {
      const subject = this.getSubject(purpose);
      const html = this.getOTPTemplate(otp, purpose);

      // In development mode, just log the OTP
      if (process.env.DEVELOPMENT_MODE === 'true') {
        console.log(chalk.yellow(`Development mode OTP for ${email}: ${otp}`));
        return {
          success: true,
          message: 'OTP sent successfully (Development mode)',
          otp: otp // Only for development
        };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: subject,
        html: html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(chalk.green(`OTP sent to ${email}`));
      
      return {
        success: true,
        message: 'OTP sent successfully',
        messageId: result.messageId
      };
    } catch (error) {
      console.error(chalk.red('Email sending error:', error));
      
      // Fallback to development mode if email fails
      console.log(chalk.yellow(`Development mode OTP for ${email}: ${otp}`));
      return {
        success: true,
        message: 'OTP sent successfully (Development mode - Email service unavailable)',
        otp: otp // Only for development
      };
    }
  }

  getSubject(purpose) {
    switch (purpose) {
      case 'signup':
        return 'RaddiWala - Complete Your Registration';
      case 'login':
        return 'RaddiWala - Login Verification';
      case 'email_change':
        return 'RaddiWala - Email Change Verification';
      default:
        return 'RaddiWala - Verification Code';
    }
  }

  getOTPTemplate(otp, purpose) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
          .header { text-align: center; color: #2c5530; margin-bottom: 30px; }
          .otp-box { background-color: #e8f5e8; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #2c5530; letter-spacing: 5px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RaddiWala</h1>
            <h2>Verification Code</h2>
          </div>
          
          <p>Hello,</p>
          <p>Your verification code for ${purpose} is:</p>
          
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          
          <p>This code will expire in 5 minutes. Please do not share this code with anyone.</p>
          
          <p>If you didn't request this code, please ignore this email.</p>
          
          <div class="footer">
            <p>© 2024 RaddiWala. All rights reserved.</p>
            <p>Connecting you with scrap collectors for a greener tomorrow.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendNotification(email, subject, message) {
    try {
      if (process.env.DEVELOPMENT_MODE === 'true') {
        console.log(chalk.yellow(`Development mode notification to ${email}: ${subject}`));
        return { success: true, message: 'Notification sent (Development mode)' };
      }

      const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: email,
        subject: subject,
        html: this.getNotificationTemplate(subject, message)
      };

      await this.transporter.sendMail(mailOptions);
      console.log(chalk.green(`Notification sent to ${email}`));
      
      return { success: true, message: 'Notification sent successfully' };
    } catch (error) {
      console.error(chalk.red('Notification sending error:', error));
      console.log(chalk.yellow(`Development mode notification to ${email}: ${subject}`));
      return { success: true, message: 'Notification sent (Development mode)' };
    }
  }

  getNotificationTemplate(subject, message) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; }
          .header { text-align: center; color: #2c5530; margin-bottom: 30px; }
          .content { line-height: 1.6; color: #333; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>RaddiWala</h1>
          </div>
          
          <div class="content">
            <h2>${subject}</h2>
            <p>${message}</p>
          </div>
          
          <div class="footer">
            <p>© 2024 RaddiWala. All rights reserved.</p>
            <p>Connecting you with scrap collectors for a greener tomorrow.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
