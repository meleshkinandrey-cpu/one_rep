define(['knockout', 'jquery', 'models/SDForms/SDForm.User'], function (ko, $, userLib) {
    var module = {
        NetworkDevice: function (parent, obj) {//NetworkDeviceForm.js, networkDevice
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
            if (obj.Name)
                self.Name = ko.observable(obj.Name);
            else self.Name = ko.observable('');
            //
            //
            if (obj.IPAddress)
                self.IPAddress = ko.observable(obj.IPAddress);
            else self.IPAddress = ko.observable('');
            //
            if (obj.InventoryNumber)
                self.InventoryNumber = ko.observable(obj.InventoryNumber);
            else self.InventoryNumber = ko.observable('');
            //
            if (obj.SerialNumber)
                self.SerialNumber = ko.observable(obj.SerialNumber);
            else self.SerialNumber = ko.observable('');
            //
            if (obj.AssetTag)
                self.AssetTag = ko.observable(obj.AssetTag);
            else self.AssetTag = ko.observable('');
            //
            if (obj.Identifier)
                self.Identifier = ko.observable(obj.Identifier);
            else self.Identifier = ko.observable('');
            //
            if (obj.Code)
                self.Code = ko.observable(obj.Code);
            else self.Code = ko.observable('');
            //
            if (obj.ConfigurationUnitID)
                self.ConfigurationUnitName = ko.observable(obj.Name);
            else self.ConfigurationUnitName = ko.observable('');
            //
            if (obj.ConfigurationUnitID)
                self.ConfigurationUnitID = ko.observable(obj.ConfigurationUnitID);
            else self.ConfigurationUnitID = ko.observable('');
            //
            self.ShowConfigurationUnit = ko.computed(function () {
                return true;
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
            if (obj.RackPosition)
                self.RackPosition = ko.observable(obj.RackPosition);
            else self.RackPosition = ko.observable('');
            //
            if (obj.OnStore)
                self.OnStore = ko.observable(obj.OnStore);
            else self.OnStore = ko.observable(false);
            //
            //
            if (obj.CriticalityID)
                self.CriticalityID = ko.observable(obj.CriticalityID);
            else self.CriticalityID = ko.observable('');
            //
            if (obj.CriticalityName)
                self.CriticalityName = ko.observable(obj.CriticalityName);
            else self.CriticalityName = ko.observable('');
            //
            if (obj.InfrastructureSegmentID)
                self.InfrastructureSegmentID = ko.observable(obj.InfrastructureSegmentID);
            else self.InfrastructureSegmentID = ko.observable('');
            //
            if (obj.InfrastructureSegmentName)
                self.InfrastructureSegmentName = ko.observable(obj.InfrastructureSegmentName);
            else self.InfrastructureSegmentName = ko.observable('');
            //
            if (obj.AdministratorClassID)
                self.AdministratorClassID = ko.observable(obj.AdministratorClassID);
            else self.AdministratorClassID = ko.observable('');
            //
            if (obj.AdministratorID)
                self.AdministratorID = ko.observable(obj.AdministratorID);
            else self.AdministratorID = ko.observable('');
            //
            if (obj.AdministratorName)
                self.AdministratorName = ko.observable(obj.AdministratorName);
            else self.AdministratorName = ko.observable('');
            //
            self.AdministratorLoaded = ko.observable(false);
            self.Administrator = ko.observable(new userLib.EmptyUser(parent, userLib.UserTypes.utilizer, parent.EditAdministrator, false, false));
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
            if (obj.Description)
                self.Description = ko.observable(obj.Description);
            else self.Description = ko.observable('');
            //
            if (obj.Note)
                self.Note = ko.observable(obj.Note);
            else self.Note = ko.observable('');
            //
            //
            if (obj.PowerConsumption)
                self.PowerConsumption = ko.observable(obj.PowerConsumption);
            else self.PowerConsumption = ko.observable(0);
            //
            if (obj.PowerConsumption)
                self.PowerConsumptionStr = ko.observable(obj.PowerConsumption);
            else self.PowerConsumptionStr = ko.observable('0');
            //
            if (obj.SNMPSecurityParametersName)
                self.SNMPSecurityParametersName = ko.observable(obj.SNMPSecurityParametersName);
            else self.SNMPSecurityParametersName = ko.observable('');
            //
            if (obj.IPMask)
                self.IPMask = ko.observable(obj.IPMask);
            else self.IPMask = ko.observable('');
            //
            if (obj.Memory)
                self.Memory = ko.observable(obj.Memory);
            else self.Memory = ko.observable('');
            //           
            self.CPU = ko.observable('CPU');
            self.Ram = ko.observable('RAM');
            //
            if (obj.CPUAutoInfo)
                parent.CPUAutoInfo(obj.CPUAutoInfo);
            else parent.CPUAutoInfo(false);
            //
            if (obj.DiskAutoInfo)
                parent.DiskAutoInfo(obj.DiskAutoInfo);
            else parent.DiskAutoInfo(false);
            //
            if (obj.RAMAutoInfo)
                parent.RAMAutoInfo(obj.RAMAutoInfo);
            else parent.RAMAutoInfo(false);
            //
            if (obj.CPUModel)
                self.CPUModel = ko.observable(obj.CPUModel);
            else self.CPUModel = ko.observable('');
            //
            if (obj.CPUModelName)
                self.CPUModelName = ko.observable(obj.CPUModelName);
            else self.CPUModelName = ko.observable('');
            //
            if (obj.DiskType)
                self.DiskType = ko.observable(obj.DiskType);
            else self.DiskType = ko.observable('');
            //
            if (obj.DiskTypeName)
                self.DiskTypeName = ko.observable(obj.DiskTypeName);
            else self.DiskTypeName = ko.observable('');
            //
            if (obj.RAMSpace)
                self.RAMSpace = ko.observable(obj.RAMSpace);
            else self.RAMSpace = ko.observable(0);
            //
            if (obj.CPUNumber)
                self.CPUNumber = ko.observable(obj.CPUNumber);
            else self.CPUNumber = ko.observable(0);
            //
            if (obj.CPUCoreNumber)
                self.CPUCoreNumber = ko.observable(obj.CPUCoreNumber);
            else self.CPUCoreNumber = ko.observable(0);
            //
            if (obj.CPUClockFrequency)
                self.CPUClockFrequency = ko.observable(obj.CPUClockFrequency);
            else self.CPUClockFrequency = ko.observable(0);
            //
            if (obj.DiskSpaceTotal)
                self.DiskSpaceTotal = ko.observable(obj.DiskSpaceTotal);
            else self.DiskSpaceTotal = ko.observable(0);
            //
            if (obj.chDetectAutomaticallyCPU)
                self.chDetectAutomaticallyCPU = ko.observable(obj.chDetectAutomaticallyCPU);
            else self.chDetectAutomaticallyCPU = ko.observable(false);
            //
            if (obj.DiskSpace)
                self.DiskSpace = ko.observable(obj.DiskSpace);
            else self.DiskSpace = ko.observable('');
            //
            if (obj.DefaultPrinter)
                self.DefaultPrinter = ko.observable(obj.DefaultPrinter);
            else self.DefaultPrinter = ko.observable('');
            //
            if (obj.TotalSlotMemory)
                self.TotalSlotMemory = ko.observable(obj.TotalSlotMemory);
            else self.TotalSlotMemory = ko.observable('');
            //
            //
            if (obj.CsManufacturerID)
                self.CsManufacturerID = ko.observable(obj.CsManufacturerID);
            else self.CsManufacturerID = ko.observable('');
            //
            if (obj.CsManufacturerName)
                self.CsManufacturerName = ko.observable(obj.CsManufacturerName);
            else self.CsManufacturerName = ko.observable('');
            //
            if (obj.CsModel)
                self.CsModel = ko.observable(obj.CsModel);
            else self.CsModel = ko.observable('');
            //
            if (obj.CsFormFactor)
                self.CsFormFactor = ko.observable(obj.CsFormFactor);
            else self.CsFormFactor = ko.observable('');
            //
            if (obj.CsSize)
                self.CsSize = ko.observable(obj.CsSize);
            else self.CsSize = ko.observable('');
            //
            if (obj.BIOSModel)
                self.BIOSModel = ko.observable(obj.BIOSModel);
            else self.BIOSModel = ko.observable('');
            //
            if (obj.BIOSVersion)
                self.BIOSVersion = ko.observable(obj.BIOSVersion);
            else self.BIOSVersion = ko.observable('');
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
            //
            self.CAT_LogicalComponent = ko.observable(obj.ProductCatalogTemplateID === 12);//Global.CAT_LogicalComponent (составной логический объект)
            self.CAT_Server = ko.observable(obj.ProductCatalogTemplateID === 6);//Global.CAT_SERVER (сервер)
            self.CAT_Switch = ko.observable(obj.ProductCatalogTemplateID === 4);//Global.CAT_SWITCH (Коммутатор)
            self.CAT_Router = ko.observable(obj.ProductCatalogTemplateID === 1);//Global.CAT_ROUTER (Маршрутизатор)
            self.CAT_Brigde = ko.observable(obj.ProductCatalogTemplateID === 8);//Global.CAT_BRIDGE (Мост)
            self.CAT_StorageSystem = ko.observable(obj.ProductCatalogTemplateID === 11);//Global.CAT_StorageSystem (Система хранения данных)
            self.CAT_NetworkDevicePrinter = ko.observable(obj.ProductCatalogTemplateID === 13);//Global.CAT_StorageSystem (Принтер (сетевое оборудование))
            //
            self.ShowAdapters = ko.computed(function () {
                return true;
            });
            //
            self.ShowPeripherals = ko.computed(function () {
                return self.CAT_Server() || self.CAT_StorageSystem() || self.CAT_LogicalComponent() || self.CAT_NetworkDevicePrinter();
            });
            //
            self.ShowPorts = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowSlots = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowInstallations = ko.computed(function () {
                return self.CAT_Server() || self.CAT_StorageSystem() || self.CAT_LogicalComponent() || self.CAT_NetworkDevicePrinter();
            });
            //
            self.ShowState = ko.computed(function () {
                return self.LifeCycleStateName();
            });
            //
            self.CanEditLocation = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowFullLocation = ko.computed(function () {
                return !self.CAT_LogicalComponent() && !self.IsLogical();
            });
            //
            self.EditIPAddressName = ko.computed(function () {
                return obj.AutoCreateNetworkUnit;
            });
            self.ShowIPAddress = ko.computed(function () {
                return true;
            });
            //
            self.ShowInventoryNumber = ko.computed(function () {
                if (self.IsLogical() && !self.LifeCycleStateName())
                    return false;
                return !self.CAT_LogicalComponent();
            });
            //
            self.ShowSerialNumber = ko.computed(function () {
               return self.ShowInventoryNumber();
            });
            //
            self.ShowIdentifier = ko.computed(function () {
                return true;
            });
            //
            self.ShowAssetTag = ko.computed(function () {
                return !self.CAT_LogicalComponent() && !self.IsLogical();
            });
            //
            self.ShowLocationBlock = ko.computed(function () {
                if(!self.IsLogical())
                    return true;
                else
                    return self.CAT_LogicalComponent() || self.CAT_Server();
            });
            //
            self.ShowRackName = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowRackPosition = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowWorkPlace = ko.computed(function () {
                return false;
            });
            //
            self.ShowDeviceName = ko.computed(function () {
                return false;
            });
            //
            self.ShowOnStore = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowUtilization = ko.computed(function () {
                return true;
            });
            //
            self.ShowUtilizer = ko.computed(function () {
                if (self.IsLogical() && !self.LifeCycleStateName())
                    return false;
                return !self.CAT_LogicalComponent();
            });
            //
            self.ShowManufacturerName = ko.computed(function () {
                return !self.CAT_LogicalComponent() && !self.IsLogical();
            });
            //
            self.ShowModelCode = ko.computed(function () {
                return !self.CAT_LogicalComponent() && !self.IsLogical();
            });
            //
            self.ShowDescription = ko.computed(function () {
                return true;
            });
            //
            self.ShowAssetCharacteristics = ko.computed(function () {
                return true;
            });
            //
            self.ShowDefaultPrinter = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowTotalSlotMemory = ko.computed(function () {
                return !self.CAT_LogicalComponent();
            });
            //
            self.ShowCorpusCharacteristics = ko.computed(function () {
                return !self.CAT_LogicalComponent() && !self.IsLogical();
            });
            //
            self.ShowPowerConsumption = ko.computed(function () {
                return !self.IsLogical();
            });
            //
            self.ShowAssetFields = ko.computed(function () {
                return self.LifeCycleStateName();
            });
            self.ProductCatalogTemplate = ko.computed(function () {
                return null;
            });
            //
            self.CanEditName = ko.observable(true);
            //
            if (!self.CAT_LogicalComponent() && !self.IsLogical())
                self.CategoryFullName = ko.observable(self.ProductCatalogCategoryName() + ' > ' + self.ProductCatalogTypeName() + ' > ' + self.ProductCatalogModelName());
            else
                self.CategoryFullName = ko.observable(self.ProductCatalogCategoryName() + ' > ' + self.ProductCatalogTypeName());
            //
            self.FullLocationForSearcher = function () {//используется в искалке по местоположению
                var retval = '';
                //
                retval += self.OrganizationName() + ' \\ ' + self.BuildingName() + ' \\ ' + self.RoomName();
                //
                if (self.RackID())
                    retval += ' \\ ' + self.RackName();
                //
                return retval;
            };
            //
            self.FullLocation = ko.computed(function () {//используется для отображения на форме
                var retval = '';
                if (self.RackID())
                    retval += self.RackName() + ' > ';
                //
                retval += self.RoomName() + ' > ' + self.BuildingName() + ' > ' + self.OrganizationName();
                return retval;
            });
            //
            self.FullName = ko.observable(self.ProductCatalogTypeName() + ' ' + self.ProductCatalogModelName() + ' ' + self.Name());
        }
    };
    return module;
});