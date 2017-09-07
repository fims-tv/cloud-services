describe("The library", () => {

    var jsonld;

    beforeEach(() => {
        jsonld = require("../lib/fims-jsonld")
    })

    it("has a default context url", () => {
        expect(jsonld.getDefaultContextURL()).toBeDefined();
    });

    it("has a default context", () => {
        expect(jsonld.getDefaultContext()).toBeDefined();
    });

});
