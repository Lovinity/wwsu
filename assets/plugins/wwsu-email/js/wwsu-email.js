"use strict";

// This class manages the emailing system.

// REQUIRES these WWSUmodules: directorReq
class WWSUemail {
	/**
	 * Construct the class
	 *
	 * @param {WWSUmodules} manager The modules class which initiated this module
	 * @param {object} options Options to be passed to this module
	 */
	constructor(manager, options) {
		this.manager = manager;

		this.dom;

		this.endpoints = {
			send: "/email/send"
		};
	}

	/**
	 * Send an email through the WWSU API.
	 *
	 * @param {object} data Data to send to the API
	 * @param {?function} cb Function to call once the API is hit.
	 */
	send(data, cb) {
		try {
			this.manager
				.get("directorReq")
				.request(
					{ dom: this.dom, method: "post", url: this.endpoints.send, data },
					response => {
						$(document).Toasts("create", {
							class: "bg-success",
							title: "Email queued",
							body: "The email was queued and will be sent in a few minutes.",
							autohide: true,
							delay: 10000,
							icon: "fas fa-skull-crossbones fa-lg"
						});
						if (typeof cb === "function") {
							cb(response);
						}
					}
				);
		} catch (e) {
			$(document).Toasts("create", {
				class: "bg-danger",
				title: "Error sending email",
				body:
					"There was an error sending the email. Please report this to the engineer.",
				autohide: true,
				delay: 10000,
				icon: "fas fa-skull-crossbones fa-lg"
			});
			console.error(e);
		}
	}

	/**
	 * Initialize the form for sending emails.
	 *
	 * @param {string} dom The DOM query string of the container to create the form.
	 */
	initForm(dom) {
		this.dom = dom;
		$(dom).alpaca({
			schema: {
				type: "object",
				properties: {
					sendTo: {
						type: "string",
						title: "Send To",
						enum: [
							"All DJs, Directors, and Assistants",
							"All Directors and Assistants",
							"All non-assistant Directors",
							"Admin Directors Only",
							"All DJs",
							"DJs Active This Semester",
							"DJs Active in the Past 30 Days",
							"DJs Active in the Past 7 Days"
						],
						required: true
					},
					bcc: {
						type: "boolean",
						title: "Send to each person as a BCC?",
						default: true
					},
					subject: {
						type: "string",
						required: true,
						title: "Email Subject",
						maxLength: 64
					},
					body: {
						type: "string",
						title: "Email Body",
						required: true
					}
				}
			},
			options: {
				fields: {
					bcc: {
						rightLabel: "Yes",
						helpers: [
							"If checked (the default), all recipients will be emailed as a blind carbon copy (BCC); this means recipients cannot see who all this email was sent to... and should someone hit reply all, it will not mass-send their response to all recipients.",
							"Also if checked, since a to recipient is required, the to field in the email will either be your email if configured (based on which director authorizes the email) or wwsu1069fm@wright.edu ."
						]
					},
					subject: {
						helper: "You are limited to 64 characters."
					},
					body: {
						type: "tinymce",
						options: {
							toolbar:
								"undo redo | bold italic underline strikethrough | fontselect fontsizeselect formatselect | alignleft aligncenter alignright alignjustify | outdent indent |  numlist bullist | forecolor backcolor removeformat | pagebreak | fullscreen preview | image link | ltr rtl",
							plugins:
								"autoresize preview paste importcss searchreplace autolink save directionality visualblocks visualchars fullscreen image link table hr pagebreak nonbreaking toc insertdatetime advlist lists wordcount imagetools textpattern noneditable help quickbars",
							menubar: "file edit view insert format tools table help"
						}
					}
				},
				form: {
					buttons: {
						submit: {
							title: "Queue Email",
							click: (form, e) => {
								form.refreshValidationState(true);
								if (!form.isValid(true)) {
									form.focus();
									return;
								}
								let value = form.getValue();
								this.send(value, response => {
									form.setValue({
										bcc: true,
										subject: null,
										body: null
									});
								});
							}
						}
					}
				}
			}
		});
	}
}
