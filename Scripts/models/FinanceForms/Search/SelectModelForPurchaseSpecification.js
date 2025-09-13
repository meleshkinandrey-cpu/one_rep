define(['knockout', 'jquery', 'ajax', 'selectControl'], function (ko, $, ajaxLib, scLib) {
    var module = {
        ViewModel: function (typeID, callbackFunc, regionID) {
            var self = this;
            self.LoadD = $.Deferred();
            //
            self.$region = $('#' + regionID);
            self.TypeID = typeID;
            self.CallBack = callbackFunc;
            //
            self.AfterRender = function () {
                self.LoadD.resolve();
            };
            //
            self.ajaxControl_loadModels = new ajaxLib.control();
            self.controlModelSelector = null;
            self.SelectedModelID = ko.observable(null);
            self.SelectedModelClassID = ko.observable(null);
            //
            self.Initialize = function () {
                var retD = $.Deferred();
                //
                var deffered = $.Deferred();
                var $regionModel = self.$region.find('.spec_form-selectmodel-dd');
                //
                if (!self.controlModelSelector) {
                    self.controlModelSelector = new scLib.control();
                    self.controlModelSelector.init($regionModel,
                        {
                            Title: getTextResource('AssetNumber_ModelName'),
                            AlwaysShowTitle: false,
                            IsSelectMultiple: false,
                            AllowDeselect: false,
                            OnEditComplete: function () {
                                var value = self.controlModelSelector.GetSelectedItems();
                                self.SelectedModelID(value.ID);
                                self.SelectedModelClassID(value.ClassID);
                            }
                        }, deffered.promise());
                }
                else {
                    self.controlModelSelector.ClearItemsList();
                    $.when(deffered).done(function (values) {
                        self.controlModelSelector.AddItemsToControl(values);
                    });
                }
                //
                var param = {
                    typeID: self.TypeID,
                };
                //
                self.ajaxControl_loadModels.Ajax($regionModel,
                    {
                        dataType: "json",
                        method: 'GET',
                        url: 'finApi/GetARSLinkModels?' + $.param(param)
                    },
                    function (newData) {
                        if (newData != null && newData.Result === 0 && newData.List) {
                            var retval = [];
                            //
                            newData.List.forEach(function (el) {
                                retval.push({
                                    ID: el.ID,
                                    Name: el.Name,
                                    ClassID: el.ClassID,
                                    Checked: false
                                });
                            });
                            //
                            deffered.resolve(retval);
                        }
                        else deffered.resolve();
                        //
                        $.when(self.controlModelSelector.$initializeCompleted).done(function () {
                            retD.resolve();
                        });
                    });
                //
                return retD.promise();
            };
            //
            self.GetValues = function () {
                if (!self.SelectedModelID() || !self.SelectedModelClassID())
                    return null;
                //
                return {
                    ID: self.SelectedModelID(),
                    ClassID: self.SelectedModelClassID()
                };
            };
        }
    };
    return module;
});