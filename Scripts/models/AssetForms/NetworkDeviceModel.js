define(['knockout'], function (ko) {
    var module = {
        Model: function (obj) {
            var self = this;
            //
            if (obj.PortNumber)
                self.PortNumber = ko.observable(obj.PortNumber);
            else self.PortNumber = ko.observable(0);
            //
            if (obj.SlotNumber)
                self.SlotNumber = ko.observable(obj.SlotNumber);
            else self.SlotNumber = ko.observable(0);
            //
            if (obj.HeightInUnits)
                self.HeightInUnits = ko.observable(obj.HeightInUnits);
            else self.HeightInUnits = ko.observable(null);
            //
            if (obj.IsRackMount)
                self.IsRackMount = ko.observable(obj.IsRackMount);
            else self.IsRackMount = ko.observable(false);
            //
            if (obj.Height)
                self.Height = ko.observable(obj.Height);
            else self.Height = ko.observable(null);
            //
            if (obj.Width)
                self.Width = ko.observable(obj.Width);
            else self.Width = ko.observable(null);
            //
            if (obj.Depth)
                self.Depth = ko.observable(obj.Depth);
            else self.Depth = ko.observable(null);
            //
            //Network printer fields
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
            if (obj.Printer_DuplexMode)
                self.Printer_DuplexMode = ko.observable(obj.Printer_DuplexMode);
            else self.Printer_DuplexMode = ko.observable(false);
            //
            if (obj.Printer_TechnologyName)
                self.Printer_TechnologyName = ko.observable(obj.Printer_TechnologyName);
            else self.Printer_TechnologyName = ko.observable('');
            //
            if (obj.Printer_MaxFormatName)
                self.Printer_MaxFormatName = ko.observable(obj.Printer_MaxFormatName);
            else self.Printer_MaxFormatName = ko.observable('');
            //
            if (obj.Printer_Speed)
                self.Printer_Speed = ko.observable(obj.Printer_Speed);
            else self.Printer_Speed = ko.observable('');
            //
            if (obj.Printer_SpeedMeasureName)
                self.Printer_SpeedMeasureName = ko.observable(obj.Printer_SpeedMeasureName);
            else self.Printer_SpeedMeasureName = ko.observable('');
            //
            if (obj.Printer_RollsCount)
                self.Printer_RollsCount = ko.observable(obj.Printer_RollsCount);
            else self.Printer_RollsCount = ko.observable('');
            //
            if (obj.ProductCatalogTemplateID)
                self.ProductCatalogTemplateID = ko.observable(obj.ProductCatalogTemplateID);
            else self.ProductCatalogTemplateID = ko.observable('');
            //
            self.CAT_NetworkDevicePrinter = ko.observable(obj.ProductCatalogTemplateID === 13);//Global.CAT_NetworkDevicePrinter
        }
    };
    return module;
});