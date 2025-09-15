define(['knockout', 'jquery', 'ttControl', 'iconHelper'], function (ko, $, tclib, ihLib) {
    var module = {
        Model: function (obj) {
            var thisObj = this;
            //
            if (obj.Name)
                thisObj.Name = ko.observable(obj.Name);
            else thisObj.Name = ko.observable('');
            //
            if (obj.CategoryName)
                thisObj.CategoryName = ko.observable(obj.CategoryName);
            else thisObj.CategoryName = ko.observable('');
            //
            if (obj.TypeName)
                thisObj.TypeName = ko.observable(obj.TypeName);
            else thisObj.TypeName = ko.observable('');
            //
            if (obj.Code)
                thisObj.Code = ko.observable(obj.Code);
            else thisObj.Code = ko.observable('');
            //
            if (obj.ProductNumber)
                thisObj.ProductNumber = ko.observable(obj.ProductNumber);
            else thisObj.ProductNumber = ko.observable('');
            //
            if (obj.OID)
                thisObj.OID = ko.observable(obj.OID);
            else thisObj.OID = ko.observable('');
            //
            if (obj.ManufacturerName)
                thisObj.ManufacturerName = ko.observable(obj.ManufacturerName);
            else thisObj.ManufacturerName = ko.observable('');
            //
            if (obj.Height)
                thisObj.Height = ko.observable(obj.Height);
            else thisObj.Height = ko.observable(null);
            //
            if (obj.Width)
                thisObj.Width = ko.observable(obj.Width);
            else thisObj.Width = ko.observable(null);
            //
            if (obj.Depth)
                thisObj.Depth = ko.observable(obj.Depth);
            else thisObj.Depth = ko.observable(null);
            //
            if (obj.Note)
                thisObj.Note = ko.observable(obj.Note);
            else thisObj.Note = ko.observable('');
            //
            if (obj.IsRackMount)
                thisObj.IsRackMount = ko.observable(obj.IsRackMount);
            else thisObj.IsRackMount = ko.observable(false);
            //
            if (obj.PortNumber)
                thisObj.PortNumber = ko.observable(obj.PortNumber);
            else thisObj.PortNumber = ko.observable(0);
            //
            if (obj.SlotNumber)
                thisObj.SlotNumber = ko.observable(obj.SlotNumber);
            else thisObj.SlotNumber = ko.observable(0);
        }
    };
    return module;
});