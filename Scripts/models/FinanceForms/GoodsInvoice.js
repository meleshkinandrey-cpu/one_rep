define(['knockout', 'ttControl'], function (ko, tclib) {
    var module = {
        GoodsInvoice: function (imList, obj) {
            var self = this;
            //
            self.ID = obj.ID;
            //
            if (obj.WorkOrderID)
                self.WorkOrderID = ko.observable(obj.WorkOrderID);
            else self.WorkOrderID = ko.observable('');
            //
            if (obj.ExistsInDataBase)
                self.ExistsInDataBase = ko.observable(obj.ExistsInDataBase);
            else self.ExistsInDataBase = ko.observable(false);
            //
            if (obj.DocumentNumber)
                self.DocumentNumber = ko.observable(obj.DocumentNumber);
            else self.DocumentNumber = ko.observable('');
            //
            if (obj.UtcDateCreated)
                self.UtcDateCreated = ko.observable(parseDate(obj.UtcDateCreated));
            else self.UtcDateCreated = ko.observable('');
            //
            if (obj.UtcDateCreated)
                self.UtcDateCreatedDT = ko.observable(new Date(parseInt(obj.UtcDateCreated)));
            else self.UtcDateCreatedDT = ko.observable(null);
            //
            if (obj.UtcDateCreated)
                self.UtcDateCreatedSecondsFrom1970 = ko.observable(obj.UtcDateCreated);
            else self.UtcDateCreatedSecondsFrom1970 = ko.observable(null);
            //
            if (obj.ConsignorID)
                self.ConsignorID = ko.observable(obj.ConsignorID);
            else self.ConsignorID = ko.observable('');
            //
            if (obj.ConsignorName)
                self.ConsignorName = ko.observable(obj.ConsignorName);
            else self.ConsignorName = ko.observable('');
            //
            self.StorageLocationID = ko.observable(obj.StorageLocationID ? obj.StorageLocationID : null);
            self.StorageLocationName = ko.observable(obj.StorageLocationName ? obj.StorageLocationName : '');
            //
            if (obj.ConsigneeID)
                self.ConsigneeID = ko.observable(obj.ConsigneeID);
            else self.ConsigneeID = ko.observable('');
            //
            if (obj.ConsigneeName)
                self.ConsigneeName = ko.observable(obj.ConsigneeName);
            else self.ConsigneeName = ko.observable('');
            //
            if (obj.SupplierID)
                self.SupplierID = ko.observable(obj.SupplierID);
            else self.SupplierID = ko.observable('');
            //
            if (obj.SupplierName)
                self.SupplierName = ko.observable(obj.SupplierName);
            else self.SupplierName = ko.observable('');
            //
            self.IsDone = ko.observable(obj.IsDone);
            //
            if (obj.BillContract)
                self.BillContract = ko.observable(obj.BillContract);
            else self.BillContract = ko.observable('');
            //
            self.FullName = ko.computed(function () {
                var name = self.DocumentNumber();
                //
                if (self.UtcDateCreated())
                    name += ' ' + getTextResource('From') + ' ' + self.UtcDateCreated();
                //
                return name;
            });
            //
            self.Selected = ko.observable(false);
            self.Selected.subscribe(function (newValue) {
                if (newValue)
                    imList.ItemChecked(self);
                else
                    imList.ItemUnchecked(self);
            });
            //
            self.Merge = function (obj) {
                self.DocumentNumber(obj.DocumentNumber);
                self.UtcDateCreated(parseDate(obj.UtcDateCreated));
                self.UtcDateCreatedSecondsFrom1970(obj.UtcDateCreated);
                self.ConsignorID(obj.ConsignorID);
                self.ConsignorName(obj.ConsignorName);
                self.ConsigneeID(obj.ConsigneeID);
                self.ConsigneeName(obj.ConsigneeName);
                self.SupplierID(obj.SupplierID);
                self.SupplierName(obj.SupplierName);
                self.StorageLocationID(obj.StorageLocationID);
                self.StorageLocationName(obj.StorageLocationName);
                self.BillContract(obj.BillContract);
                self.ExistsInDataBase(obj.ExistsInDataBase);
            };
            //
            self.CheckShowTooltipMessage = function (obj, event) {
                if (obj && event) {
                    var $this = $(event.currentTarget);
                    //
                    var hiddenElement = $this.find('span:first').clone().appendTo('body');
                    var nameWidth = hiddenElement.width();
                    hiddenElement.remove();
                    //
                    var treeAreaWidth = $('.invoice-list-item-name').width();
                    //
                    if (!nameWidth || !treeAreaWidth)
                        return;
                    //
                    if (nameWidth > treeAreaWidth) {
                        var ttcontrol = new tclib.control();
                        ttcontrol.init($this, { text: self.FullName(), showImmediat: true, showTime: false });
                    }
                }
                return true;
            };
        }
    };
    return module;
});