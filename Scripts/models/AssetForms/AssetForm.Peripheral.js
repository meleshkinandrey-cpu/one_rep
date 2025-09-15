define(['knockout', 'jquery', 'models/SDForms/SDForm.User'], function (ko, $, userLib) {
    var module = {
        Peripheral: function (parent, obj) {//NetworkDeviceForm.js, peripheral
            var self = this;
            //
            if (obj.ID)
                self.ID = ko.observable(obj.ID);
            else self.ID = ko.observable('');
            //
            if (obj.ClassID)
                self.ClassID = ko.observable(obj.ClassID);
            else self.ClassID = ko.observable('');
            //
            if (obj.InventoryNumber)
                self.InventoryNumber = ko.observable(obj.InventoryNumber);
            else self.InventoryNumber = ko.observable('');
            //
            if (obj.SerialNumber)
                self.SerialNumber = ko.observable(obj.SerialNumber);
            else self.SerialNumber = ko.observable('');
            //
            if (obj.Code)
                self.Code = ko.observable(obj.Code);
            else self.Code = ko.observable('');
            //
            self.ShowConfigurationUnit = ko.computed(function () {
                return false;
            });
            //
            if (obj.OrganizationName)
                self.OrganizationName = ko.observable(obj.OrganizationName);
            else self.OrganizationName = ko.observable('');
            //
            if (obj.BuildingName)
                self.BuildingName = ko.observable(obj.BuildingName);
            else self.BuildingName = ko.observable(null);
            //
            if (obj.RoomID)
                self.RoomID = ko.observable(obj.RoomID);
            else self.RoomID = ko.observable('');
            //
            if (obj.RoomName)
                self.RoomName = ko.observable(obj.RoomName);
            else self.RoomName = ko.observable('');
            //
            if (obj.RackID)
                self.RackID = ko.observable(obj.RackID);
            else self.RackID = ko.observable('');
            //
            if (obj.RackName)
                self.RackName = ko.observable(obj.RackName);
            else self.RackName = ko.observable('');
            //
            if (obj.WorkPlaceID)
                self.WorkPlaceID = ko.observable(obj.WorkPlaceID);
            else self.WorkPlaceID = ko.observable('');
            //
            if (obj.WorkPlaceName)
                self.WorkPlaceName = ko.observable(obj.WorkPlaceName);
            else self.WorkPlaceName = ko.observable('');
            //
            if (obj.OnStore)
                self.OnStore = ko.observable(obj.OnStore);
            else self.OnStore = ko.observable(false);
            //
            if (obj.DeviceClassID)
                self.DeviceClassID = ko.observable(obj.DeviceClassID);
            else self.DeviceClassID = ko.observable('');
            //
            if (obj.DeviceID)
                self.DeviceID = ko.observable(obj.DeviceID);
            else self.DeviceID = ko.observable('');
            //
            if (obj.DeviceName)
                self.DeviceName = ko.observable(obj.DeviceName);
            else self.DeviceName = ko.observable('');
            //
            if (obj.DeviceFullName)
                self.DeviceFullName = ko.observable(obj.DeviceFullName);
            else self.DeviceFullName = ko.observable('');
            //
            //
            if (obj.UtilizerID)
                self.UtilizerID = ko.observable(obj.UtilizerID);
            else self.UtilizerID = ko.observable('');
            //
            if (obj.UtilizerClassID)
                self.UtilizerClassID = ko.observable(obj.UtilizerClassID);
            else self.UtilizerClassID = ko.observable('');
            //
            self.UtilizerLoaded = ko.observable(false);
            self.Utilizer = ko.observable(new userLib.EmptyUser(parent, userLib.UserTypes.utilizer, parent.EditUtilizer, false, false));
            //
            //
            if (obj.ProductCatalogCategoryName)
                self.ProductCatalogCategoryName = ko.observable(obj.ProductCatalogCategoryName);
            else self.ProductCatalogCategoryName = ko.observable('');
            //
            if (obj.ProductCatalogTemplateID)
                self.ProductCatalogTemplateID = ko.observable(obj.ProductCatalogTemplateID);
            else self.ProductCatalogTemplateID = ko.observable('');
            //
            if (obj.ProductCatalogTemplateName)
                self.ProductCatalogTemplateName = ko.observable(obj.ProductCatalogTemplateName);
            else self.ProductCatalogTemplateName = ko.observable('');
            //
            if (obj.ProductCatalogTypeName)
                self.ProductCatalogTypeName = ko.observable(obj.ProductCatalogTypeName);
            else self.ProductCatalogTypeName = ko.observable('');
            //
            if (obj.ManufacturerName)
                self.ManufacturerName = ko.observable(obj.ManufacturerName);
            else self.ManufacturerName = ko.observable('');
            //
            if (obj.ProductCatalogModelID)
                self.ProductCatalogModelID = ko.observable(obj.ProductCatalogModelID);
            else self.ProductCatalogModelID = ko.observable(null);
            //
            if (obj.ProductCatalogModelName)
                self.ProductCatalogModelName = ko.observable(obj.ProductCatalogModelName);
            else self.ProductCatalogModelName = ko.observable('');
            //
            if (obj.ProductCatalogModelCode)
                self.ProductCatalogModelCode = ko.observable(obj.ProductCatalogModelCode);
            else self.ProductCatalogModelCode = ko.observable('');
            //
            //
            if (obj.Note)
                self.Note = ko.observable(obj.Note);
            else self.Note = ko.observable('');
            //
            //
            if (obj.LifeCycleStateName)
                self.LifeCycleStateName = ko.observable(obj.LifeCycleStateName);
            else self.LifeCycleStateName = ko.observable('');
            //
            self.IsWorking = ko.observable(obj.IsWorking ? getTextResource('IsWorking_True') : getTextResource('IsWorking_False'));
            //
            if (obj.DateInquiry)
                self.DateInquiry = ko.observable('Дата последнего опроса: ' + obj.DateInquiry);
            else self.DateInquiry = ko.observable('Дата последнего опроса: ' + '');
            //
            //
            if (obj.IsLogical)
                self.IsLogical = ko.observable(obj.IsLogical);
            else self.IsLogical = ko.observable(false);
            //
            self.ShowState = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.CanEditLocation = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowFullLocation = ko.computed(function () {
                return true;
            });
            //
            self.ShowIPAddress = ko.computed(function () {
                return false;
            });
            //
            self.ShowInventoryNumber = ko.computed(function () {
                return true;
            });
            //
            self.ShowSerialNumber = ko.computed(function () {
                return true;
            });
            //
            self.ShowIdentifier = ko.computed(function () {
                return false;
            });
            //
            self.ShowAssetTag = ko.computed(function () {
                return false;
            });
            //
            self.ShowLocationBlock = ko.computed(function () {
                return true;
            });
            //
            self.ShowRackName = ko.computed(function () {
                return self.DeviceClassID() == 5 && self.RackID();
            });
            //
            self.ShowRackPosition = ko.computed(function () {
                return false;
            });
            //
            self.ShowWorkPlace = ko.computed(function () {
                return self.DeviceClassID() == 6 && self.WorkPlaceID();
            });
            //
            self.ShowDeviceName = ko.computed(function () {
                return self.DeviceID();
            });
            //
            self.ShowOnStore = ko.computed(function () {
                return true;
            });
            //
            self.ShowUtilization = ko.computed(function () {
                return true;
            });
            //
            self.ShowUtilizer = ko.computed(function () {
                return self.ShowUtilization();
            });
            //
            self.ShowManufacturerName = ko.computed(function () {
                return true;
            });
            //
            self.ShowModelCode = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowDescription = ko.computed(function () {
                return false;
            });
            //
            self.ShowAssetCharacteristics = ko.computed(function () {
                return false;
            });
            //
            self.ShowPowerConsumption = ko.computed(function () {
                return false;
            });
            //
            self.ShowDefaultPrinter = ko.computed(function () {
                return false;
            });
            //
            self.ShowTotalSlotMemory = ko.computed(function () {
                return false;
            });
            //
            self.ShowCorpusCharacteristics = ko.computed(function () {
                return false;
            });
            //
            self.ShowAssetFields = ko.computed(function () {
                return self.LifeCycleStateName();
            });
            //
            self.Name = ko.observable(self.ProductCatalogTemplateName() + ' ' + self.ProductCatalogModelName());
            self.CanEditName = ko.observable(false);
            //
            if (!self.IsLogical())
                self.CategoryFullName = ko.observable(self.ProductCatalogCategoryName() + ' > ' + self.ProductCatalogTypeName() + ' > ' + self.ProductCatalogModelName());
            else
                self.CategoryFullName = ko.observable(self.ProductCatalogCategoryName() + ' > ' + self.ProductCatalogTypeName());
            //
            self.FullLocationForSearcher = function () {//используется в искалке по местоположению
                var retval = '';
                //
                if (self.RoomID())
                    retval = self.OrganizationName() + ' \\ ' + self.BuildingName() + ' \\ ' + self.RoomName();
                else if (self.DeviceID())
                    retval = self.DeviceFullName();
                //
                return retval;
            };
            //
            self.FullLocation = ko.computed(function () {//используется для отображения на форме
                var retval = '';
                if (self.DeviceID()) {
                    retval += self.DeviceName() + ' > ';
                    if (self.DeviceClassID() == 5 && self.RackID()) {
                        retval += self.RackName() + ' > ';
                    }
                    else if (self.DeviceClassID() == 6 && self.WorkPlaceID()) {
                        retval += self.WorkPlaceName() + ' > ';
                    }
                }
                //
                retval += self.RoomName() + ' > ' + self.BuildingName() + ' > ' + self.OrganizationName();
                return retval;
            });
            //
            self.ShowAdapters = ko.computed(function () {
                return false;
            });
            //
            self.ShowPeripherals = ko.computed(function () {
                return false;
            });
            //
            self.ShowPorts = ko.computed(function () {
                return false;
            });
            //
            self.ShowSlots = ko.computed(function () {
                return false;
            });
            //
            self.ShowInstallations = ko.computed(function () {
                return false;
            });
            //
            self.ProductCatalogTemplate = ko.computed(function () {
                return null;
            });
        }
    };
    return module;
});