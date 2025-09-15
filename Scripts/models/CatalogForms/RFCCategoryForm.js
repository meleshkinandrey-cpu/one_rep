define(['knockout', 'jquery', 'ajax', 'usualForms'], function (ko, $, ajaxLib, fhModule) {
    var module = {
        ViewModel: function (obj, $region) {
            var self = this;
            //
            self.$region = $region;
            //
            self.ID = obj ? obj.ID : null;
            self.AfterRender = function () {
            };
            self.Object = ko.observable(null);
            //
            self.Summary = ko.observable(obj ? obj.Name : '');
            //
            self.ajaxControl_loadModel = new ajaxLib.control();
            self.Load = function () {
                var retD = $.Deferred();
                //
                if (self.ID == null) {
                    return retD.resolve();
                }
                    var param = {
                        ModelID: self.ID
                    };
                    //
                    self.ajaxControl_loadModel.Ajax(self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'catalogApi/GetRFCCategoryByID?' + $.param(param)
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                if (newVal.Model) {
                                    self.Object(module.ObjectModel(newVal.Model));
                                }
                            }
                            else if (newVal && newVal.Result === 1)
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[RFCCatagoryForm.js, LoadInfo]', 'error');
                                });
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[RFCCatagoryForm.js, LoadInfo]', 'error');
                                });
                            retD.resolve();
                        },
                        null,
                        function () {
                            retD.resolve();
                        });
                //
                return retD;
            };
            self.ajaxControl_saveRFCCategory = new ajaxLib.control();
            self.Save = function () {
                var retval = $.Deferred();
                //                
                var data = {
                    'ID': self.ID,
                    'Name': self.Summary()
                };
                // 
                if (!data.Name || data.Name.trim().length == 0) {
                    require(['sweetAlert'], function () {
                        swal(getTextResource('EnterName'));
                    });
                    retval.resolve(null);
                    return;
                }
                //
                showSpinner();
                self.ajaxControl_saveRFCCategory.Ajax(null,
                    {
                        url: 'catalogApi/saveRFCCategory',
                        method: 'POST',
                        dataType: 'json',
                        data: data
                    },
                    function (response) {//RFCRegistrationResponse
                        hideSpinner();
                        if (response.Result == 0) {//ok 
                            retval.resolve(response.ID);
                            return;
                        }
                        else if (response.Result == 2) {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource(response.Error), 'error');
                            });
                            retval.resolve(null);
                        }
                        else {
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[RFCRegistration.js, RegisterRFC]', 'error');
                            });
                            retval.resolve(null);
                        }
                    },
                    function (response) {
                        hideSpinner();
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[RFCRegistration.js, RegisterRFC]', 'error');
                        });
                        retval.resolve(null);
                    });
                //
                return retval.promise();
            }
       },
        ObjectModel: function (obj) {
            var nself = this;
            nself.ID = obj.ID;
            nself.Name = obj.Name;
        }
    };
    return module;

});