define(['knockout', 'jquery', 'ttControl', 'models/FinanceForms/ActivesRequestSpecification'], function (ko, $, tclib, arsLib) {
    var module = {
        Normalize: arsLib.Normalize,
        ToMoneyString: arsLib.ToMoneyString,
        Specification: function (imList, obj) {
            var self = this;
            //
            self.ID = obj.ID;
            self.GoodsInvoiceID = ko.observable(obj.GoodsInvoiceID);
            self.OrderNumber = ko.observable(obj.OrderNumber);
            self.SpecificationNumber = ko.observable(obj.SpecificationNumber);
            self.CargoName = ko.observable(obj.CargoName);
            self.ProductCatalogModelID = obj.ProductCatalogModelID;
            self.ProductCatalogModelClassID = obj.ProductCatalogModelClassID;
            self.Price = ko.observable(obj.Price);
            self.Count = ko.observable(obj.Count);
            self.NDSType = ko.observable(obj.NDSType);
            self.NDSPercent = ko.observable(obj.NDSPercent);
            self.NDSCustomValue = ko.observable(module.Normalize(obj.NDSCustomValue));
            self.Note = ko.observable(obj.Note);
            self.UnitID = ko.observable(obj.UnitID);
            //
            self.ProductCatalogModelFullName = ko.observable(obj.ProductCatalogModelFullName);
            self.ProductCatalogTypeName = ko.observable(obj.ProductCatalogTypeName);
            self.UnitName = ko.observable(obj.UnitName);
            self.PriceWithoutNDS = ko.observable(module.Normalize(obj.PriceWithoutNDS));
            self.PriceWithNDS = ko.observable(module.Normalize(obj.PriceWithNDS));
            self.SumNDS = ko.observable(module.Normalize(obj.SumNDS));
            self.CostWithNDS = ko.observable(module.Normalize(obj.CostWithNDS));
            self.CostWithoutNDS = ko.observable(module.Normalize(obj.CostWithoutNDS));
            self.NDSTypeString = ko.observable(obj.NDSTypeString);
            self.NDSPercentString = ko.observable(obj.NDSPercentString);
            self.IsDone = ko.observable(obj.IsDone);
            self.ProductCatalogCategoryID = obj.ProductCatalogCategoryID;
            self.ProductCatalogTypeID = obj.ProductCatalogTypeID;
            //
            if (obj.PurchaseSpecificationIDList)
                self.PurchaseSpecificationIDList = obj.PurchaseSpecificationIDList;
            else
                self.PurchaseSpecificationIDList = [];
            //
            self.Selected = ko.observable(false);
            self.Selected.subscribe(function (newValue) {
                if (newValue) {
                    if (self.ID)
                        imList.ItemChecked(self);
                    else
                        imList.SelectedItems.push(self);
                }
                else {
                    if (self.ID)
                        imList.ItemUnchecked(self);
                    else
                        imList.SelectedItems.remove(self);
                }
            });
            //
            if (obj.TempID)
                self.TempID = obj.TempID;//используется для несохраненных в БД строк накладных
            //
            if (obj.InvoiceDocumentNumber)
                self.InvoiceDocumentNumber = ko.observable(obj.InvoiceDocumentNumber);
            else self.InvoiceDocumentNumber = ko.observable('');
            //
            if (obj.InvoiceUtcDateCreated)
                self.InvoiceUtcDateCreated = ko.observable(parseDate(obj.InvoiceUtcDateCreated));
            else self.InvoiceUtcDateCreated = ko.observable('');
            //
            if (obj.InvoiceConsignorName)
                self.InvoiceConsignorName = ko.observable(obj.InvoiceConsignorName);
            else self.InvoiceConsignorName = ko.observable('');
            //
            if (obj.InvoiceConsigneeName)
                self.InvoiceConsigneeName = ko.observable(obj.InvoiceConsigneeName);
            else self.InvoiceConsigneeName = ko.observable('');
            //
            if (obj.ExistsInDataBase)
                self.ExistsInDataBase = ko.observable(obj.ExistsInDataBase);
            else self.ExistsInDataBase = ko.observable(false);
            //
            self.NDSCustomValueString = ko.computed(function () {
                return module.ToMoneyString(self.NDSCustomValue());
            });
            //
            self.PriceWithNDSString = ko.computed(function () {
                return module.ToMoneyString(self.PriceWithNDS());
            });
            self.PriceWithoutNDSString = ko.computed(function () {
                return module.ToMoneyString(self.PriceWithoutNDS());
            });
            self.CostWithNDSString = ko.computed(function () {
                return module.ToMoneyString(self.CostWithNDS());
            });
            self.CostWithoutNDSString = ko.computed(function () {
                return module.ToMoneyString(self.CostWithoutNDS());
            });
            //
            self.NDSInfo = ko.computed(function () {
                if (self.NDSType() === 1) //Не облагается
                    return self.NDSTypeString();
                //
                if (self.NDSPercent() === 0) //Вручную
                    return self.NDSPercentString();
                else return self.NDSPercentString() + '%';
            });
            //
            if (obj.PurchaseSpecificationList)
                self.PurchaseSpecificationList = obj.PurchaseSpecificationList;//для отображения списка связанных строк спецификации закупки у несохраненной строки тн
            //
            self.Merge = function (obj) {
                if (!obj)
                    return;
                //
                if (obj.ID)
                    self.ID = obj.ID;
                if (obj.OrderNumber)
                    self.OrderNumber(obj.OrderNumber);
                if (obj.SpecificationNumber)
                    self.SpecificationNumber(obj.SpecificationNumber);
                if (obj.CargoName)
                    self.CargoName(obj.CargoName);
                if (obj.PriceWithoutNDS)
                    self.PriceWithoutNDS(obj.PriceWithoutNDS);
                if (obj.PriceWithNDS)
                    self.PriceWithNDS(obj.PriceWithNDS);
                if (obj.Count)
                    self.Count(obj.Count);
                if (obj.Price)
                    self.Price(obj.Price);
                if (obj.Delivered)
                    self.Delivered(obj.Delivered);
                if (obj.UnitID)
                    self.UnitID(obj.UnitID);
                if (obj.UnitName)
                    self.UnitName(obj.UnitName);
                //self.DependencyActiveRequestsSpecificationCount(obj.DependencyActiveRequestsSpecificationCount);
                //self.State(obj.State);
                if (obj.NDSType !== null)
                    self.NDSType(obj.NDSType);
                if (obj.NDSPercent)
                    self.NDSPercent(obj.NDSPercent);
                if (obj.NDSCustomValue)
                    self.NDSCustomValue(obj.NDSCustomValue);
                if (obj.Note)
                    self.Note(obj.Note);
                if (obj.ProductCatalogModelID)
                    self.ProductCatalogModelID = obj.ProductCatalogModelID;
                if (obj.ProductCatalogModelClassID)
                    self.ProductCatalogModelClassID = obj.ProductCatalogModelClassID;
                if (obj.ProductCatalogModelFullName)
                    self.ProductCatalogModelFullName(obj.ProductCatalogModelFullName);
                if (obj.ProductCatalogTypeName)
                    self.ProductCatalogTypeName(obj.ProductCatalogTypeName);
                self.ProductCatalogCategoryID = obj.ProductCatalogCategoryID;
                self.ProductCatalogTypeID = obj.ProductCatalogTypeID;
                if (obj.SumNDS)
                    self.SumNDS(obj.SumNDS);
                if (obj.CostWithNDS)
                    self.CostWithNDS(obj.CostWithNDS);
                if (obj.CostWithoutNDS)
                    self.CostWithoutNDS(obj.CostWithoutNDS);
                //
                //self.StateString(obj.StateString);
                if (obj.NDSTypeString)
                    self.NDSTypeString(obj.NDSTypeString);
                if (obj.NDSPercentString)
                    self.NDSPercentString(obj.NDSPercentString);
                //
                if (obj.ExistsInDataBase)
                    self.ExistsInDataBase(obj.ExistsInDataBase);
                if (obj.PurchaseSpecificationIDList)
                    self.PurchaseSpecificationIDList = obj.PurchaseSpecificationIDList;
                //
                if (obj.TempID)
                    self.TempID = obj.TempID;
            };
        }
    };
    return module;
});