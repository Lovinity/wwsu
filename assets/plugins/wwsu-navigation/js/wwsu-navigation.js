// This class manages the sidebar navigation menu on WWSU pages

class WWSUNavigation {

    constructor() {
        this.elements = [];
    }

    // Add a new menu item to the class, along with click and keypress events
    addItem (dom, section, url, defaultItem = false) {
        this.elements.push({ dom, section, url });

        if (defaultItem) {
            $(dom).addClass("active");
            $(section).css("display", "");
        } else {
            $(dom).removeClass("active");
            $(section).css("display", "none");
        }

        $(dom).click((event) => {
            this.processMenu(dom);
        });
        $(dom).keypress((event) => {
            if (event.which === 13) {
                this.processMenu(dom);
            }
        })
    }

    // Cycle through all added navigation items and activate the one provided in dom
    processMenu (dom) {

        // De-activate all menu items and hide all their sections
        this.elements.forEach((element) => {
            $(element.dom).removeClass("active");
            $(element.section).css("display", "none");
        });

        // Activate the menu item passed as dom parameter, and un-hide its section
        this.elements
            .filter((element) => element.dom === dom)
            .map((element) => {
                $(element.dom).addClass("active");
                $(element.section).css("display", "");
            });
    }
}