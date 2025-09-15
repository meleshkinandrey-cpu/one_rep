define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        MaxCount: 2000000000,
        ViewModel: function (generateInvNumber, generateCode, callback, $region) {
            self = this;
            self.$region = $region;
            self.LoadD = $.Deferred();
            //
            self.ShowGenerateInvNumber = ko.observable(generateInvNumber);
            self.ShowGenerateCode = ko.observable(generateCode);
            //
            self.InventoryNumber_Prefix = ko.observable(null);
            self.InventoryNumber_Length = ko.observable(null);
            self.InventoryNumber_Value = ko.observable(null);
            self.Code_Prefix = ko.observable(null);
            self.Code_Length = ko.observable(null);
            self.Code_Value = ko.observable(null);
            self.FillInventoryNumber = ko.observable(generateInvNumber);
            self.FillSubdeviceInventoryNumber = ko.observable(generateInvNumber);
            self.FillCode = ko.observable(generateCode);
            self.FillSubdeviceCode = ko.observable(generateCode);
            self.ReplaceInvNumber = ko.observable(true);
            self.ReplaceCode = ko.observable(true);
            self.SetInvNumberIfDuplicate = ko.observable(true);
            self.SetCodeIfDuplicate = ko.observable(true);
            //
            self.ajaxControl = new ajaxLib.control();
            self.Load = function () {
                self.ajaxControl.Ajax(self.$region,
                {
                    dataType: 'json',
                    method: 'GET',
                    url: 'imApi/GetAssetIdentifierSettingInfo'
                },
                function (newVal) {
                    if (newVal && newVal.Result === 0) {
                        settings = newVal.Settings;
                        //
                        self.InventoryNumber_Prefix(settings.InventoryNumber_Prefix);
                        self.InventoryNumber_Length(settings.InventoryNumber_Length);
                        self.InventoryNumber_Value(settings.InventoryNumber_Value);
                        //
                        self.Code_Prefix(settings.Code_Prefix);
                        self.Code_Length(settings.Code_Length);
                        self.Code_Value(settings.Code_Value);
                        //
                        self.LoadD.resolve();
                    }
                    else {
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[AssetIdentifierSet.js, Load]', 'error');
                        });
                    }
                })
            };
            //
            self.InitializeSteppers = function () {
                var $input = self.$region.find('.assetIdentifierSet-ValueLength-TextField');
                $input.stepper({
                    type: 'int',
                    floatPrecission: 0,
                    wheelStep: 1,
                    arrowStep: 1,
                    limit: [0, module.MaxCount],
                    onStep: function (val, up) {
                        self.InventoryNumber_Length(val);
                    }
                });
                //
                var $input = self.$region.find('.assetIdentifierSet-Value-TextField');
                $input.stepper({
                    type: 'int',
                    floatPrecission: 0,
                    wheelStep: 1,
                    arrowStep: 1,
                    limit: [0, module.MaxCount],
                    onStep: function (val, up) {
                        self.InventoryNumber_Value(val);
                    }
                });
                //
                var $input = self.$region.find('.assetCodeSet-ValueLength-TextField');
                $input.stepper({
                    type: 'int',
                    floatPrecission: 0,
                    wheelStep: 1,
                    arrowStep: 1,
                    limit: [0, module.MaxCount],
                    onStep: function (val, up) {
                        self.Code_Length(val);
                    }
                });
                //
                var $input = self.$region.find('.assetCodeSet-Value-TextField');
                $input.stepper({
                    type: 'int',
                    floatPrecission: 0,
                    wheelStep: 1,
                    arrowStep: 1,
                    limit: [0, module.MaxCount],
                    onStep: function (val, up) {
                        self.Code_Value(val);
                    }
                });
            };
            //
            self.AfterRender = function () {
                //self.InitializeSteppers();
            };
            //
            self.GetParams = function () {
                var data =
                    {
                        InventoryNumber_Prefix: self.InventoryNumber_Prefix(),
                        InventoryNumber_Length: self.InventoryNumber_Length(),
                        InventoryNumber_Value: self.InventoryNumber_Value(),
                        Code_Prefix: self.Code_Prefix(),
                        Code_Length: self.Code_Length(),
                        Code_Value: self.Code_Value(),
                        FillInventoryNumber: self.FillInventoryNumber(),
                        FillSubdeviceInventoryNumber: self.FillSubdeviceInventoryNumber(),
                        FillCode: self.FillCode(),
                        FillSubdeviceCode: self.FillSubdeviceCode(),
                        ReplaceInvNumber: self.ReplaceInvNumber(),
                        ReplaceCode: self.ReplaceCode(),
                    };
                //
                return data;
            };
        }
    };
    return module;
});