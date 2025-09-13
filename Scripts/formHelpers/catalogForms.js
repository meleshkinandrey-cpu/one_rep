define(['jquery', 'knockout', 'formControl', 'catalogForms'], function ($, ko, fc, cfh) {
    var module = {
        formHelper: function (isSpinnerActive) {
            var self = this;
            self.ShowRFCCategory = function (obj, reload) {
                {//granted operations
                    {
                        self.grantedOperations = [];
                        self.userID;
                        self.userHasRoles;
                        $.when(userD).done(function (user) {
                            self.userID = user.UserID;
                            self.userHasRoles = user.HasRoles;
                            self.grantedOperations = user.GrantedOperations;
                        });
                        self.operationIsGranted = function (operationID) {
                            for (var i = 0; i < self.grantedOperations.length; i++)
                                if (self.grantedOperations[i] === operationID)
                                    return true;
                            return false;
                        };
                    }
                }
                if (isSpinnerActive != true)
                    showSpinner();
                //
                var buttons = {};
                var ctrl = undefined;
                var mod = undefined;
                var buttonTextAdd = obj == null ? getTextResource('Add') : getTextResource('ButtonSave');
                if ((self.operationIsGranted(711001) && obj == null) || (self.operationIsGranted(711002) && obj != null))
                buttons[buttonTextAdd] = function () {
                    var d = mod.Save();
                    $.when(d).done(function (result) {     
                        if (result) {
                            ctrl.Close();
                            reload(result);
                        }
                    });
                };
                buttons[getTextResource('CancelButtonText')] = function () { ctrl.Close(); }
                //
                ctrl = new fc.control('RFCCategory', 'RFCCategory', getTextResource('RFCCategory'), true, true, true, 500, 200, buttons, null, 'data-bind="template: {name: \'Catalog/RFCCategoryForm\', afterRender: AfterRender}"');
                if (!ctrl.Initialized)
                    return;
                var ctrlD = ctrl.Show();
                //
                ctrl.ExtendSize(500, 200);
                //
                require(['models/CatalogForms/RFCCategoryForm'], function (vm) {
                    var region = $('#' + ctrl.GetRegionID());
                    mod = new vm.ViewModel(obj, region);
                    ko.applyBindings(mod, document.getElementById(ctrl.GetRegionID()));
                    //
                    var LoadD = mod.Load();
                    $.when(ctrlD, LoadD).done(function (ctrlResult, loadResult) {
                        hideSpinner();
                    });
                });
            };

        }
    }
    return module;
});