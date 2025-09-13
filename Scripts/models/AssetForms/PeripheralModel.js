define(['knockout'], function (ko) {
    var module = {
        Model: function (obj) {
            var self = this;
            //
            //printer fields
            if (obj.Printer_MaxPageCount)
                self.Printer_MaxPageCount = ko.observable(obj.Printer_MaxPageCount);
            else self.Printer_MaxPageCount = ko.observable('');
            //
            if (obj.Printer_NomPageCount)
                self.Printer_NomPageCount = ko.observable(obj.Printer_NomPageCount);
            else self.Printer_NomPageCount = ko.observable('');
            //
            if (obj.Printer_Color)
                self.Printer_Color = ko.observable(obj.Printer_Color);
            else self.Printer_Color = ko.observable(false);
            //
            if (obj.Printer_Photo)
                self.Printer_Photo = ko.observable(obj.Printer_Photo);
            else self.Printer_Photo = ko.observable(false);
            //
            self.OBJ_Peripheral_Printer = ko.observable(obj.ProductCatalogTemplateID === 345);//Global.OBJ_Peripheral_Printer
        }
    };
    return module;
});
