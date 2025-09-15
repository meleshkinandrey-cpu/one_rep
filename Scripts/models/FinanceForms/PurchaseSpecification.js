define(['knockout', 'jquery', 'ttControl', 'models/FinanceForms/ActivesRequestSpecification'], function (ko, $, tclib, arsLib) {
    var module = {
        Normalize: arsLib.Normalize,
        ToMoneyString: arsLib.ToMoneyString,
        PredNormalize: arsLib.PredNormalize,
        ToFormattedMoneyString: arsLib.ToFormattedMoneyString,
        Specification: function (imList, obj) {
            var self = this;
            //
            self.ID = obj.ID;
            self.ClassID = obj.ClassID;
            self.WorkOrderID = obj.WorkOrderID;
            self.OrderNumber = ko.observable(obj.OrderNumber);
            self.PriceWithoutNDS = ko.observable(module.Normalize(obj.PriceWithoutNDS));
            self.PriceWithNDS = ko.observable(module.Normalize(obj.PriceWithNDS));
            self.Count = ko.observable(obj.Count);
            self.Price = ko.observable(obj.Price);//не для таблиц-списков, для формы
            self.Delivered = ko.observable(obj.Delivered);
            self.UnitID = ko.observable(obj.UnitID);
            self.UnitName = ko.observable(obj.UnitName);
            self.DependencyActiveRequestsSpecificationCount = ko.observable(obj.DependencyActiveRequestsSpecificationCount);
            self.State = ko.observable(obj.State);
            self.NDSType = ko.observable(obj.NDSType);
            self.NDSPercent = ko.observable(obj.NDSPercent);
            self.NDSCustomValue = ko.observable(module.Normalize(obj.NDSCustomValue));
            self.Note = ko.observable(obj.Note);
            self.ProductCatalogModelID = obj.ProductCatalogModelID;
            self.ProductCatalogModelClassID = obj.ProductCatalogModelClassID;
            self.ProductCatalogModelFullName = ko.observable(obj.ProductCatalogModelFullName);
            self.ProductCatalogTypeName = ko.observable(obj.ProductCatalogTypeName);
            self.SumNDS = ko.observable(module.Normalize(obj.SumNDS));
            self.CostWithNDS = ko.observable(module.Normalize(obj.CostWithNDS));
            self.CostWithoutNDS = ko.observable(module.Normalize(obj.CostWithoutNDS));
            //
            self.StateString = ko.observable(obj.StateString);
            self.NDSTypeString = ko.observable(obj.NDSTypeString);
            self.NDSPercentString = ko.observable(obj.NDSPercentString);
            //
            self.NDSCustomValueString = ko.computed(function () {
                return module.ToMoneyString(self.NDSCustomValue());
            });
            self.PriceWithNDSString = ko.computed(function () {
                return module.ToMoneyString(self.PriceWithNDS());
            });
            self.PriceWithoutNDSString = ko.computed(function () {
                return module.ToMoneyString(self.PriceWithoutNDS());
            });
            self.SumNDSString = ko.computed(function () {
                return module.ToMoneyString(self.SumNDS());
            });
            self.CostWithNDSString = ko.computed(function () {
                return module.ToMoneyString(self.CostWithNDS());
            });
            self.CostWithoutNDSString = ko.computed(function () {
                return module.ToMoneyString(self.CostWithoutNDS());
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
            self.NDSInfo = ko.computed(function () {
                if (self.NDSType() === 1) //Не облагается
                    return self.NDSTypeString();
                //
                if (self.NDSPercent() === 0) //Вручную
                    return self.NDSPercentString();
                else return self.NDSPercentString() + '%';
            });
            //
            self.ActiveRequestComputed = ko.computed(function () {
                var count = self.DependencyActiveRequestsSpecificationCount();
                if (count)
                    return '' + count;
                //
                return getTextResource('False');
            });
            //
            self.CountPlan = ko.observable(0);
            self.CountPlanByOthers = ko.observable(0);
            //
            self.DeliveredComputed = ko.computed(function () {
                if (self.Count() == null || self.Delivered() == null)
                    return '';
                //
                var deliveredPlan = self.Delivered() + self.CountPlan() + self.CountPlanByOthers();
                //
                return '' + deliveredPlan + ' ' + getTextResource('NegotiationFrom') + ' ' + self.Count();
            });
            //
            self.Merge = function (obj) {
                if (!obj)
                    return;
                //
                self.OrderNumber(obj.OrderNumber);
                self.PriceWithoutNDS(obj.PriceWithoutNDS);
                self.PriceWithNDS(obj.PriceWithNDS);
                self.Count(obj.Count);
                self.Price(obj.Price);
                self.Delivered(obj.Delivered);
                self.UnitID(obj.UnitID);
                self.UnitName(obj.UnitName);
                self.DependencyActiveRequestsSpecificationCount(obj.DependencyActiveRequestsSpecificationCount);
                self.State(obj.State);
                self.NDSType(obj.NDSType);
                self.NDSPercent(obj.NDSPercent);
                self.NDSCustomValue(obj.NDSCustomValue);
                self.Note(obj.Note);
                self.ProductCatalogModelID = obj.ProductCatalogModelID;
                self.ProductCatalogModelClassID = obj.ProductCatalogModelClassID;
                self.ProductCatalogModelFullName(obj.ProductCatalogModelFullName);
                self.ProductCatalogTypeName(obj.ProductCatalogTypeName);
                self.SumNDS(obj.SumNDS);
                self.CostWithNDS(obj.CostWithNDS);
                self.CostWithoutNDS(obj.CostWithoutNDS);
                //
                self.StateString(obj.StateString);
                self.NDSTypeString(obj.NDSTypeString);
                self.NDSPercentString(obj.NDSPercentString);
            };
        }
    };
    return module;
});