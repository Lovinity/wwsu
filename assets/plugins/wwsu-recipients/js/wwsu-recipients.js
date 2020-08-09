// This class manages chat recipients from a host level.
// NOTE: event also supports 'recipientChanged' emitted when a new recipient is selected. Parameter is the selected recipient.

class WWSUrecipients extends WWSUdb {
  /**
   * The class constructor.
   *
   * @param {sails.io} socket The sails.io socket connected to the WWSU API.
   * @param {WWSUmeta} meta Initialized WWSUmeta class
   * @param {WWSUreq} hostReq Request with host authorization
   */
  constructor(socket, meta, hostReq) {
    super();

    this.endpoints = {
      get: "/recipients/get",
      addComputer: "/recipients/add-computer",
    };
    this.data = {
      get: {},
      addComputer: {},
    };
    this.requests = {
      host: hostReq,
    };

    this.meta = meta;

    this.assignSocketEvent("recipients", socket);

    this.activeRecipient = null;

    this.formModal = new WWSUmodal(`Select recipient`, null, ``, true, {
      headerColor: "",
      zindex: 1100,
    });

    // Determines if we connected to the API at least once before
    this.connectedBefore = false;

    // If true, ignores whether or not this host is already connected
    this.development = true;

    // Contains info about the current recipient
    this.recipient = {};

    this.animations = new WWSUanimations();

    this.table;
    this.initTable();
  }

  // Initialize connection. Call this on socket connect event.
  init() {
    this.replaceData(this.requests.host, this.endpoints.get, this.data.get);
  }

  // Open the modal to choose a recipient.
  openRecipients() {
    this.formModal.iziModal("open");
  }

  /**
   * Add this host as a computer recipient to the WWSU API (register as online).
   *
   * @param {string} host Name of the host being registered
   * @param {function} cb Callback; response as first parameter, boolean true = success, false = no success (or another host is already connected) for second parameter
   */
  addRecipientComputer(host, cb) {
    this.requests.host.request(
      {
        method: "post",
        url: this.endpoints.addComputer,
        data: { host: host },
      },
      (response2) => {
        try {
            this.recipient = response2;
          if (
            this.connectedBefore ||
            (typeof response2.alreadyConnected !== "undefined" &&
              !response2.alreadyConnected) ||
            this.development
          ) {
            this.connectedBefore = true;
            cb(response2, true);
          } else {
            cb(response2, false);
          }
        } catch (e) {
            this.recipient = {};
          cb({}, false);
          console.error(e);
        }
      }
    );
  }

  /**
   * Initialize data table of recipient selection. Uses the modal.
   *
   * @param {string} table DOM query string of the div container which to place the table.
   */
  initTable() {
    this.animations.add("recipients-init-table", () => {
      var util = new WWSUutil();

      // Init html
      $(this.formModal.body).html(
        `<table id="recipients-table" class="table table-striped display responsive" style="width: 100%;"></table>`
      );

      util.waitForElement(`#recipients-table`, () => {
        // Generate table
        this.table = $(`#recipients-table`).DataTable({
          paging: false,
          data: [],
          columns: [
            { title: "Icon" },
            { title: "Status" },
            { title: "Group" },
            { title: "Friendly Name" },
            { title: "Messages" },
            { title: "Actions" },
          ],
          columnDefs: [
            { responsivePriority: 1, targets: 5 },
            { responsivePriority: 2, targets: 3 },
          ],
          order: [[2, "desc"]],
          pageLength: 10,
          drawCallback: () => {
            // Action button click events
            $(".btn-recipient-choose").unbind("click");

            $(".btn-recipient-choose").click((e) => {
              var recipient = this.find().find(
                (recipient) =>
                  recipient.ID === parseInt($(e.currentTarget).data("id"))
              );
              this.activeRecipient = recipient;
              this.emitEvent("recipientChanged", [recipient]);
              this.formModal.iziModal("close");
            });
          },
        });
      });
    });
  }

  /**
   * Update the recipients selection table if it exists.
   * NOTE: You should call WWSUmessages.updateRecipientsTable instead.
   */
  _updateTable(recipients) {
    this.animations.add("recipients-update-table", () => {
      if (this.table) {
        this.table.clear();
        recipients.map((recipient) => {
          this.table.row.add([
            jdenticon.toSvg(recipient.host, 32),
            (recipient.host === "website" && this.meta.meta.webchat) ||
            recipient.status !== 0
              ? `<span class="text-success">ONLINE</span>`
              : `<span class="text-danger">OFFLINE</span>`,
            recipient.group,
            recipient.label,
            recipient.unreadMessages,
            `<div class="btn-group">
                        <button class="btn btn-sm btn-primary btn-recipient-choose" data-id="${recipient.ID}" title="Select this recipient"><i class="fas fa-mouse-pointer"></i></button>
                        </div>`,
          ]);
        });
        this.table.draw();
      }
    });
  }
}
