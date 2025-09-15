define(['knockout', 'jquery', 'ttControl'], function (ko, $, tclib) {
    var module = {
        Normalize: function (decimal) { //берем число и делаем из него 2хзнаковое
            if (decimal !== null)
                return Math.floor(Math.floor(decimal * 1000) / 10) / 100;
            //
            return decimal;
        },
        PredNormalize: function (decimal) { //подгатавливаем число для рассчетов без плавающей точки, не забыть в конце разделить на 100
            if (decimal !== null)
                return Math.floor(Math.floor(decimal * 1000) / 10);
            //
            return decimal;
        },
        ToMoneyString: function (x, delimiter, sep, grp) {
            return getMoneyString(x, delimiter, sep, grp);
        },
        ToFormattedMoneyString: function (str) {
            return getFormattedMoneyString(str);
        },
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
			self.UnitID = ko.observable(obj.UnitID);
			self.UnitName = ko.observable(obj.UnitName);
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
			    if (newValue && imList)
					imList.ItemChecked(self);
			    else if (imList)
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
			self.Merge = function (obj) {
				self.OrderNumber(obj.OrderNumber);
				self.PriceWithoutNDS(obj.PriceWithoutNDS);
				self.PriceWithNDS(obj.PriceWithNDS);
				self.Count(obj.Count);
				self.Price(obj.Price);
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
				self.UnitID(obj.UnitID);
				self.UnitName(obj.UnitName);
			    //
				self.StateString(obj.StateString);
				self.NDSTypeString(obj.NDSTypeString);
				self.NDSPercentString(obj.NDSPercentString);
			};
		}
	};
	return module;
});