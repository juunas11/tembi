var mailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');
var config = require('../config/email');

var mailerAddr = 'tmbmailer@gmail.com';

var transporter = mailer.createTransport(smtpTransport({
	host: 'smtp.mailgun.org',
	secure: true,
	auth: {
		user: config.user,
		pass: config.pass
	},
	authMethod: 'PLAIN'
}));

var sendMail = function(mail){
	if(!process.env.DISABLE_EMAIL){
		transporter.sendMail(mail, function(err, info){
			if(err){
				console.log(err);
			}else{
				console.log('Email sent: ' + info.response);
			}
		});
	}
};

var sendForgotPasswordEmail = function(email, recoveryToken){
	var mail = {
		from: mailerAddr,
		to: email,
		subject: 'TEMBI - Forgotten password',
		text: 'Hello!\nA request was made to request a new password. Enter the following code into the app to make a new password!\n\n' + recoveryToken + '\n\nBest regards,\nTeam Mobing'
	};

	sendMail(mail);
};

var sendWorkspaceInvitation = function(email, sendingUser){
	var mail = {
		from: mailerAddr,
		to: email,
		subject: 'TEMBI - You have been invited',
		text: 'Hello!\n' + sendingUser.firstName + ' ' + sendingUser.lastName + ' has invited you to collaborate with his/her team! Download TEMBI and sign up using this email to answer the invitation!\n\nBest regards,\nTeam Mobing'
	};

	sendMail(mail);
};

exports.sendForgotPWEmail = sendForgotPasswordEmail;
exports.sendWorkspaceInvitation = sendWorkspaceInvitation;