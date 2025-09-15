define(['knockout', 'jquery', 'models/SDForms/SDForm.User', 'dateTimeControl'], function (ko, $, userLib, dtLib) {
    var module = {
        AssetFields: function (parent, obj) {
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
            //
            if (obj.UtcDateReceived)
                self.UtcDateReceived = ko.observable(parseDate(obj.UtcDateReceived, true));//show only date
            else self.UtcDateReceived = ko.observable('');
            //
            if (obj.UtcDateReceived)
                self.UtcDateReceivedDT = ko.observable(new Date(parseInt(obj.UtcDateReceived)));
            else self.UtcDateReceivedDT = ko.observable(null);
            //
            if (obj.SupplierID)
                self.SupplierID = ko.observable(obj.SupplierID);
            else self.SupplierID = ko.observable('');
            //
            if (obj.SupplierName)
                self.SupplierName = ko.observable(obj.SupplierName);
            else self.SupplierName = ko.observable('');
            //
            if (obj.Cost)
                self.Cost = ko.observable(obj.Cost);
            else self.Cost = ko.observable(0);
            //
            if (obj.Cost)
                self.CostStr = ko.observable(getFormattedMoneyString(obj.Cost.toString()));
            else self.CostStr = ko.observable(getFormattedMoneyString('0'));
            //
            if (obj.Document)
                self.Document = ko.observable(obj.Document);
            else self.Document = ko.observable('');
            //
            //
            if (obj.OwnerID)
                self.OwnerID = ko.observable(obj.OwnerID);
            else self.OwnerID = ko.observable('');
            //
            if (obj.OwnerClassID)
                self.OwnerClassID = ko.observable(obj.OwnerClassID);
            else self.OwnerClassID = ko.observable('');
            //
            self.OwnerLoaded = ko.observable(false);
            self.Owner = ko.observable(new userLib.EmptyUser(parent, userLib.UserTypes.owner, parent.EditOwner, false, false));
            //
            /*if (obj.UtilizerID)
                self.UtilizerID = ko.observable(obj.UtilizerID);
            else self.UtilizerID = ko.observable('');
            //
            if (obj.UtilizerClassID)
                self.UtilizerClassID = ko.observable(obj.UtilizerClassID);
            else self.UtilizerClassID = ko.observable('');
            //
            self.UtilizerLoaded = ko.observable(false);
            self.Utilizer = ko.observable(new userLib.EmptyUser(parent, userLib.UserTypes.utilizer, parent.EditUtilizer, false, false));*/
            //
            //
            if (obj.UtcWarranty)
                self.UtcWarranty = ko.observable(parseDate(obj.UtcWarranty, true));//show only date
            else self.UtcWarranty = ko.observable('');
            //
            if (obj.UtcWarranty)
                self.UtcWarrantyDT = ko.observable(new Date(parseInt(obj.UtcWarranty)));
            else self.UtcWarrantyDT = ko.observable(null);
            //
            if (obj.ServiceCenterID)
                self.ServiceCenterID = ko.observable(obj.ServiceCenterID);
            else self.ServiceCenterID = ko.observable('');
            //
            if (obj.ServiceCenterName)
                self.ServiceCenterName = ko.observable(obj.ServiceCenterName);
            else self.ServiceCenterName = ko.observable('');
            //
            if (obj.ServiceContractID)
                self.ServiceContractID = ko.observable(obj.ServiceContractID);
            else self.ServiceContractID = ko.observable('');
            //
            if (obj.ServiceContractNumber)
                self.ServiceContractNumber = ko.observable(obj.ServiceContractNumber);
            else self.ServiceContractNumber = ko.observable('');
            //
            if (obj.UserID)
                self.UserID = ko.observable(obj.UserID);
            else self.UserID = ko.observable('');
            //
            self.UserLoaded = ko.observable(false);
            self.User = ko.observable(new userLib.EmptyUser(parent, userLib.UserTypes.mResponsible, parent.EditUser, false, false));
            //
            if (obj.Founding)
                self.Founding = ko.observable(obj.Founding);
            else self.Founding = ko.observable('');
            //
            if (obj.StorageID)
                self.StorageID = ko.observable(obj.StorageID);
            else self.StorageID = ko.observable('');
            //
            if (obj.StorageName)
                self.StorageName = ko.observable(obj.StorageName);
            else self.StorageName = ko.observable('');
            //
            if (obj.UtcAppointmentDate)
                self.UtcAppointmentDate = ko.observable(parseDate(obj.UtcAppointmentDate, true));//show only date
            else self.UtcAppointmentDate = ko.observable('');
            //
            if (obj.UtcAppointmentDate)
                self.UtcAppointmentDateDT = ko.observable(new Date(parseInt(obj.UtcAppointmentDate)));
            else self.UtcAppointmentDateDT = ko.observable(null);
            //
            self.UserFieldList = ko.observableArray([]);
            if (obj.UserFieldList) {
                ko.utils.arrayForEach(obj.UserFieldList, function (item) {
                    self.UserFieldList.push(
                    {
                        FieldNumber: item.FieldNumber,
                        FieldName: ko.observable(item.FieldName),
                        Value: ko.observable(item.Value),
                    });
                });
            }
            //
            //TODO: использовать parametersControl?
            /*self.UserField1 = ko.observable(obj.UserField1 ? obj.UserField1 : '');
            self.UserField2 = ko.observable(obj.UserField2 ? obj.UserField2 : '');
            self.UserField3 = ko.observable(obj.UserField3 ? obj.UserField3 : '');
            self.UserField4 = ko.observable(obj.UserField4 ? obj.UserField4 : '');
            self.UserField5 = ko.observable(obj.UserField5 ? obj.UserField5 : '');
            //
            self.UserField1Name = obj.UserField1Name;
            self.UserField2Name = obj.UserField2Name;
            self.UserField3Name = obj.UserField3Name;
            self.UserField4Name = obj.UserField4Name;
            self.UserField5Name = obj.UserField5Name;*/
        }
    };
    return module;
});
