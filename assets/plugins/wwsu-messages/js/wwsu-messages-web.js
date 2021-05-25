"use strict";

// This class manages messages/chat from a host level
// NOTE: event also supports 'newMessage' emitted when a new message is received that should be notified.

// REQUIRES these WWSUmodules: WWSUrecipientsweb, WWSUMeta, noReq (WWSUreq), WWSUutil, WWSUanimations
class WWSUmessagesweb extends WWSUdb {
  /**
   * The class constructor.
   *
   * @param {WWSUmodules} manager The modules class which initiated this module
   * @param {object} options Options to be passed to this module
   */
  constructor(manager, options) {
    super();

    this.manager = manager;

    this.endpoints = {
      get: "/messages/get-web",
      send: "/messages/send-web"
    };
    this.data = {
      get: {}
    };

    this.assignSocketEvent("messages", this.manager.socket);

    this.chatStatus;
    this.chatMessages;
    this.chatForm;
    this.menuNew;
    this.menuIcon;

    this.read = [];
    this.notified = [];

    // Prune old messages (over 1 hour old) every minute.
    this.prune = setInterval(() => {
      this.find().forEach(message => {
        if (
          moment(
            this.manager.get("WWSUMeta")
              ? this.manager.get("WWSUMeta").meta.time
              : undefined
          )
            .subtract(1, "hours")
            .isAfter(moment(message.createdAt))
        ) {
          this.query({ remove: message.ID });
        }
      });
    }, 60000);

    this.firstLoad = true;

    // Event handlers
    this.on("remove", "WWSUmessagesweb", (query, db) => {
      this.read = this.read.filter(value => value !== query);
      this.notified = this.notified.filter(value => value !== query);
    });
    this.on("change", "WWSUmessagesweb", db => {
      this.updateMessages();
    });
    this.on("newMessage", "WWSUmessagesweb", message => {
      $(document).Toasts("create", {
        class: "bg-primary",
        title: `New Message from ${message.fromFriendly}`,
        autohide: true,
        delay: 15000,
        body: `${message.message}<p><strong>To reply:</strong> Click "Chat with DJ" in the left menu.</p>`,
        icon: "fas fa-comment fa-lg"
      });
    });
  }

  /**
   * Initialize chat components. This should be called before init (eg. on DOM ready).
   *
   * @param {string} chatStatus DOM query string where the chat status info box is contained.
   * @param {string} chatMessages DOM query string where chat messages should be displayed.
   * @param {string} chatForm DOM query string where the Alpaca form for sending messages should be generated.
   * @param {string} menuNew DOM query string of the badge containing number of unread messages
   * @param {string} menuIcon DOM query string of the menu icon to flash green when an unread message is present
   */
  initComponents(chatStatus, chatMessages, chatForm, menuNew, menuIcon) {
    // Set properties
    this.chatStatus = chatStatus;
    this.chatMessages = chatMessages;
    this.chatForm = chatForm;
    this.menuNew = menuNew;
    this.menuIcon = menuIcon;

    // Add listener for newMeta to determine when the chat is blocked and to update chat statuses
    this.manager
      .get("WWSUMeta")
      .on("newMeta", "WWSUmessagesweb", (newMeta, fullMeta) => {
        if (
          typeof newMeta.webchat !== "undefined" ||
          typeof newMeta.state !== "undefined"
        )
          this.updateChatStatus(fullMeta);
      });

    // Generate current chat status HTML
    this.updateChatStatus(this.manager.get("WWSUMeta").meta);

    $(this.chatForm).html(``);

    // Generate Alpaca form
    $(this.chatForm).alpaca({
      schema: {
        type: "object",
        properties: {
          nickname: {
            type: "string",
            title: "Nickname"
          },
          message: {
            type: "string",
            title: "Message",
            required: true,
            maxLength: 1024
          }
        }
      },
      options: {
        fields: {
          nickname: {
            helper:
              "This is the name the DJ and other listeners will see you. If you leave blank, a random name will be given to you."
          },
          message: {
            "type": "markdown"
          }
        },
        form: {
          buttons: {
            submit: {
              title: "Send Publicly",
              click: (form, e) => {
                form.refreshValidationState(true);
                if (!form.isValid(true)) {
                  form.focus();
                  return;
                }

                let value = form.getValue();
                value.private = false; // Public message

                // Update nickname
                if (value.nickname && value.nickname !== "") {
                  this.manager
                    .get("WWSUrecipientsweb")
                    .editRecipientWeb(value.nickname);
                } else {
                  value.nickname = this.manager
                    .get("WWSUrecipientsweb")
                    .recipient.label.replace("Web ", "")
                    .match(/\(([^)]+)\)/)[1];
                }

                // Send message
                this.send(value, success => {
                  if (success) {
                    form.clear();
                  }
                });
              }
            },
            submitPrivate: {
              title: "Send Privately",
              click: (form, e) => {
                form.refreshValidationState(true);
                if (!form.isValid(true)) {
                  form.focus();
                  return;
                }

                let value = form.getValue();
                value.private = true; // Private message

                // Update nickname
                if (value.nickname && value.nickname !== "") {
                  this.manager
                    .get("WWSUrecipientsweb")
                    .editRecipientWeb(value.nickname);
                } else {
                  value.nickname = this.manager
                    .get("WWSUrecipientsweb")
                    .recipient.label.replace("Web ", "")
                    .match(/\(([^)]+)\)/)[1];
                }

                // Send message
                this.send(value, success => {
                  if (success) {
                    form.clear();
                  }
                });
              }
            }
          }
        },

        data: {
          nickname: this.manager.get("WWSUrecipientsweb")
            ? this.manager
                .get("WWSUrecipientsweb")
                .recipient.label.replace("Web ", "")
                .match(/\(([^)]+)\)/)[1]
            : "Unknown Visitor"
        }
      }
    });

    this.updateMessages();
  }

  // Initialize connection. Call this on socket connect event.
  init() {
    this.replaceData(
      this.manager.get("noReq"),
      this.endpoints.get,
      this.data.get
    );
  }

  /**
   * Send a message via WWSU API.
   *
   * @param {object} data Data to pass to WWSU API
   * @param {?function} cb Callback function after request is completed.
   */
  send(data, cb) {
    try {
      this.manager
        .get("noReq")
        .request(
          { method: "post", url: this.endpoints.send, data },
          response => {
            if (response !== "OK") {
              $(document).Toasts("create", {
                class: "bg-warning",
                title: "Error sending message",
                body:
                  "There was an error sending the message. Either you are sending too many messages too quickly (no more than 3 per minute allowed), or the DJ opted to disallow messages during their show. If neither are true, please contact the engineer at wwsu4@wright.edu.",
                autohide: true,
                delay: 30000,
                icon: "fas fa-skull-crossbones fa-lg"
              });
              if (typeof cb === "function") {
                cb(false);
              }
            } else {
              $(document).Toasts("create", {
                class: "bg-success",
                title: "Message sent",
                body: "Your message was sent!",
                autohide: true,
                delay: 5000,
              });
              if (typeof cb === "function") {
                cb(true);
              }
            }
          }
        );
    } catch (e) {
      $(document).Toasts("create", {
        class: "bg-danger",
        title: "Error sending message",
        body:
          "There was an error sending the message. Please report this to the engineer at wwsu4@wright.edu.",
        autohide: true,
        delay: 10000,
        icon: "fas fa-skull-crossbones fa-lg"
      });
      if (typeof cb === "function") {
        cb(false);
      }
      console.error(e);
    }
  }

  /**
   * Generate an HTML block for a message.
   * NOTE: This does NOT return the direct-chat-msg container; you must construct this first.
   *
   * @param {object} message The message
   * @returns {string} The HTML for this message
   */
  messageHTML(message) {
    // Message was from this host
    if (message.from === this.manager.get("WWSUrecipientsweb").recipient.host) {
      return `<div class="direct-chat-msg right">
            <div class="direct-chat-infos clearfix">
              <span class="direct-chat-name float-right">YOU -> ${
                message.toFriendly
              }</span>
              <span class="direct-chat-timestamp float-left">${moment
                .tz(
                  message.createdAt,
                  this.manager.get("WWSUMeta")
                    ? this.manager.get("WWSUMeta").meta.timezone
                    : moment.tz.guess()
                )
                .format("hh:mm A")}</span>
            </div>
            <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(
              message.from,
              40
            )}</div>
            <div class="direct-chat-text bg-success">
                ${discordMarkdown.toHTML(message.message)}
            </div>
        </div>`;
    } else {
      // Unread message
      if (this.read.indexOf(message.ID) === -1) {
        return `<div class="direct-chat-msg">
                <div class="direct-chat-infos clearfix">
                  <span class="direct-chat-name float-left">${
                    message.fromFriendly
                  } -> ${message.toFriendly}</span>
                  <span class="direct-chat-timestamp float-right">${moment
                    .tz(
                      message.createdAt,
                      this.manager.get("WWSUMeta")
                        ? this.manager.get("WWSUMeta").meta.timezone
                        : moment.tz.guess()
                    )
                    .format("hh:mm A")} </span></span>
                </div>
                <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(
                  message.from,
                  40
                )}</div>
                <div class="direct-chat-text bg-danger">
                    ${discordMarkdown.toHTML(message.message)}
                </div>
            </div>`;
        // Read message
      } else {
        return `<div class="direct-chat-msg">
                <div class="direct-chat-infos clearfix">
                  <span class="direct-chat-name float-left">${
                    message.fromFriendly
                  } -> ${message.toFriendly}</span>
                  <span class="direct-chat-timestamp float-right">${moment
                    .tz(
                      message.createdAt,
                      this.manager.get("WWSUMeta")
                        ? this.manager.get("WWSUMeta").meta.timezone
                        : moment.tz.guess()
                    )
                    .format("hh:mm A")}</span></span>
                </div>
                <div class="direct-chat-img bg-secondary">${jdenticon.toSvg(
                  message.from,
                  40
                )}</div>
                <div class="direct-chat-text bg-secondary">
                    ${discordMarkdown.toHTML(message.message)}
                </div>
            </div>`;
      }
    }
  }

  /**
   * Update the chat status box depending on current state and if webchat is enabled.
   * @param {object} meta current WWSUMeta.meta
   */
  updateChatStatus(meta) {
    this.manager
      .get("WWSUanimations")
      .add("messages-website-status-update", () => {
        if (!meta.webchat) {
          $(this.chatStatus).html(`<div class="callout callout-danger">
            <h5>Messages are not allowed right now</h5>
            <p>The DJ currently on the air requested not to allow web messages during their show. Or, the chat was globally disabled by the directors for now.</p>
          </div>`);
        } else if (meta.state.startsWith("automation_")) {
          $(this.chatStatus).html(`<div class="callout callout-warning">
            <h5>Messages will likely not be seen</h5>
            <p>The chat is enabled, but there might not be anyone in the radio studio to see your messages at this time.</p>
          </div>`);
        } else if (meta.state.startsWith("prerecord_")) {
          $(this.chatStatus).html(`<div class="callout callout-info">
            <h5>Messages will be emailed to the hosts</h5>
            <p>The show currently airing is prerecorded. Although there might not be anyone to see your messages, your messages will be emailed to the show hosts when the prerecord is finished airing (if you send the message before it is done airing).</p>
          </div>`);
        } else if (
          meta.state.startsWith("sports_") ||
          meta.state.startsWith("sportsremote_")
        ) {
          $(this.chatStatus).html(`<div class="callout callout-success">
            <h5>Messages will be delivered</h5>
            <p>When you send a message, it will be delivered to the hosts of the current sports broadcast, and they will be notified.</p>
          </div>`);
        } else if (
          meta.state.startsWith("live_") ||
          meta.state.startsWith("remote_")
        ) {
          $(this.chatStatus).html(`<div class="callout callout-success">
            <h5>Messages will be delivered</h5>
            <p>When you send a message, it will be delivered to the hosts of the current broadcast, and they will be notified.</p>
          </div>`);
        } else {
          $(this.chatStatus).html(`<div class="callout callout-secondary">
            <h5>Unknown status</h5>
            <p>It is unknown at this time how your sent messages will be treated.</p>
          </div>`);
        }
      });
  }

  /**
   * Update messages to be displayed.
   */
  updateMessages() {
    let unreadMessages = 0;

    if (!this.manager.get("WWSUrecipientsweb").recipient.host) return;

    // Check for and notify of new messages
    this.find()
      .filter(
        msg =>
          msg.to === "website" ||
          msg.to.startsWith(
            this.manager.get("WWSUrecipientsweb").recipient.host
          )
      )
      .forEach(msg => {
        // Count unread messages
        if (this.read.indexOf(msg.ID) === -1) unreadMessages++;

        // Notify on new messages
        if (!this.firstLoad && this.notified.indexOf(msg.ID) === -1) {
          this.notified.push(msg.ID);
          this.emitEvent("newMessage", [msg]);
        }
      });

    // Update unread messages stuff
    if (unreadMessages <= 0) {
      $(this.menuNew).html(`0`);
      $(this.menuNew).removeClass(`badge-danger`);
      $(this.menuNew).addClass(`badge-secondary`);
      $(this.menuIcon).removeClass(`pulse-success`);
    } else {
      $(this.menuNew).html(unreadMessages);
      $(this.menuNew).removeClass(`badge-secondary`);
      $(this.menuNew).addClass(`badge-danger`);
      $(this.menuIcon).addClass(`pulse-success`);
    }

    // Update messages HTML
    let chatHTML = ``;

    let query = {
      to: [
        "website",
        "DJ",
        "DJ-private",
        this.manager.get("WWSUrecipientsweb").recipient.host
      ]
    };

    $(this.chatMessages).html(``);

    this.find(query)
      .sort(
        (a, b) => moment(a.createdAt).valueOf() - moment(b.createdAt).valueOf()
      )
      .map(message => {
        chatHTML += `<div class="message" id="message-${message.ID}">
                ${this.messageHTML(message)}
                </div>`;
        this.manager
          .get("WWSUutil")
          .waitForElement(`#message-${message.ID}`, () => {
            $(`#message-${message.ID}`).unbind("click");

            $(`#message-${message.ID}`).click(() => {
              if (this.read.indexOf(message.ID) === -1) {
                this.read.push(message.ID);
                this.updateMessages();
              }
            });
          });
      });

    $(this.chatMessages).html(chatHTML);

    // Mark this is no longer first loaded
    this.firstLoad = false;
  }
}
