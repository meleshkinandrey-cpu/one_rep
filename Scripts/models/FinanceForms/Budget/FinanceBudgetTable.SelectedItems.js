define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        ViewModel: function () {
            var self = this;
            //
            self.ajaxControl = new ajaxLib.control();
            //
            self.Table = null; //init on Load
            //
            self.Load = function (table) {
                self.Table = table;
                self.InitOperationList();
                //
                self.selectedOperation(self.OperationList()[0]);
            };
            //
            self.RowChecked = function (obj) {
                var already = ko.utils.arrayFirst(self.SelectedRows(), function (el) {
                    return el['ID'] == obj['ID'];
                });
                if (already == null)
                    self.SelectedRows.push(obj);
            };
            self.RowUnchecked = function (obj) {
                var already = ko.utils.arrayFirst(self.SelectedRows(), function (el) {
                    return el['ID'] == obj['ID'];
                });
                if (already != null)
                    self.SelectedRows.remove(obj);
            };
            //
            self.ClearSelection = function () {
                self.SelectedRows.removeAll();
            };
            //            
            self.selectedOperation = ko.observable(null);
            self.selectedOperation.subscribe(function (newValue) {
                var actionsLabel = self.OperationList()[0];
                if (self.selectedOperation() == actionsLabel)
                    return;
                //
                newValue.Command();
                self.selectedOperation(actionsLabel);
            });
            self.getAvailableOperationList = function () {
                return {
                    data: self.OperationList(),
                    totalCount: self.OperationList().length
                };
            };
            //
            self.SelectedRows = ko.observableArray([]);
            self.SelectedRowsCount = ko.computed(function () {
                var count = 0;
                if (self.SelectedRows() != null)
                    count = self.SelectedRows().length;
                //
                if (self.Table)
                    self.Table.RenderTableComplete();
                //
                return count;
            });
            //
            self.OperationList = ko.observableArray([]);
            self.AddOperation = function (operationOptions) {
                if (!operationOptions || !operationOptions.Text || !operationOptions.Command)
                    return;
                self.OperationList.push(
                    new module.Operation(
                        self,
                        operationOptions.Text,
                        operationOptions.Command,
                        operationOptions.Validator
                    ));
            };
            //
            self.GetObjectID = function (row) {
                if (row.RealObjectID)
                    return row.RealObjectID;
                else
                    return row.ID;
            };
            //
            self.InitOperationList = function () {
                var o_def = {};
                {
                    o_def.Text = ' - ' + getTextResource('Actions') + ' - ';
                    o_def.Validator = function () { return true; };
                    o_def.Command = function () { };
                }
                self.AddOperation(o_def);
                //                
                $.when(operationIsGrantedD(852)).done(function (o_properties) {
                    if (o_properties != true) return;
                    var o = {};
                    {
                        o.Text = getTextResource('ActionEdit');
                        o.Validator = function (selectedItems) { return selectedItems.length == 1; };
                        o.Command = function () {
                            var id = self.GetObjectID(self.SelectedRows()[0]);
                            if (!id) return;
                            //
                            showSpinner();
                            require(['financeForms'], function (module) {
                                var fh = new module.formHelper(true);
                                fh.ShowFinanceBudget(id);//properties mode
                            });
                        };
                    }
                    self.AddOperation(o);
                });
                //
                $.when(operationIsGrantedD(853)).done(function (o_add) {
                    if (o_add != true) return;
                    var o = {};
                    {
                        o.Text = getTextResource('Add');
                        o.Validator = function (selectedItems) { return true; };
                        o.Command = function () {
                            showSpinner();
                            require(['financeForms'], function (module) {
                                var fh = new module.formHelper(true);
                                fh.ShowFinanceBudget(null);//add mode
                            });
                        };
                    }
                    self.AddOperation(o);
                });
                //
                $.when(operationIsGrantedD(854)).done(function (o_delete) {
                    if (o_delete != true) return;
                    var o = {};
                    {
                        o.Text = getTextResource('ActionRemove');
                        o.Validator = function (selectedItems) { return selectedItems.length > 0; };
                        o.Command = function () {
                            var ids = [];
                            var rows = self.SelectedRows();
                            for (var i = 0; i < rows.length; i++)
                                ids.push(self.GetObjectID(rows[i]));
                            if (ids.length == 0) return;
                            //
                            showSpinner();
                            self.ajaxControl.Ajax(null,
                                {
                                    url: 'finApi/deleteFinanceBudget',
                                    method: 'POST',
                                    data: { IDList: ids }
                                },
                                function (response) {
                                    hideSpinner();
                                    if (response) {
                                        if (response.Result == 0) {//ok                                            
                                            for (var i = 0; i < ids.length; i++)
                                                $(document).trigger('local_objectDeleted', [179, ids[i], null]);//OBJ_Budget                                            
                                            //
                                            if (self.Table)
                                                self.Table.RenderTableComplete();
                                            //
                                            if (response.Message && response.Message.length > 0)
                                                require(['sweetAlert'], function () {
                                                    swal({
                                                        title: response.Message,
                                                        showCancelButton: false,
                                                        closeOnConfirm: true,
                                                        cancelButtonText: getTextResource('Continue')
                                                    });
                                                });
                                        }
                                        else if (response.Result === 7) {
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('OperationError'), 'error');
                                            });
                                        }
                                    }
                                },
                                function (response) {
                                    hideSpinner();
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[FinanceBudgetTable.SelectedItems.js, Save]', 'error');
                                    });
                                });
                        };
                    }
                    self.AddOperation(o);
                });
                //
                $.when(operationIsGrantedD(855)).done(function (o_update) {
                    if (o_update != true) return;
                    var o = {};
                    {
                        o.Text = getTextResource('FinanceBudget_Approve');
                        o.Validator = function (selectedItems) { return selectedItems.length == 1; };
                        o.Command = function () {
                            var id = self.GetObjectID(self.SelectedRows()[0]);
                            //
                            showSpinner();
                            self.ajaxControl.Ajax(null,
                                {
                                    url: 'finApi/approveFinanceBudget?' + $.param({ id: id }),
                                    method: 'POST'
                                },
                                function (response) {
                                    hideSpinner();
                                    if (response) {
                                        if (response.Result == 0) {//ok                                            
                                            self.Table.Reload();
                                            //
                                            if (response.Message && response.Message.length > 0)
                                                require(['sweetAlert'], function () {
                                                    swal({
                                                        title: response.Message,
                                                        showCancelButton: false,
                                                        closeOnConfirm: true,
                                                        cancelButtonText: getTextResource('Continue')
                                                    });
                                                });
                                        }
                                        else if (response.Result === 7)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('OperationError'), 'error');
                                            });
                                        else if (response.Result === 8)
                                            require(['sweetAlert'], function () {
                                                swal(getTextResource('ErrorCaption'), getTextResource('ValidationError'), 'error');
                                            });
                                    }
                                },
                                function (response) {
                                    hideSpinner();
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[FinanceBudgetTable.SelectedItems.js, Save]', 'error');
                                    });
                                });
                        };
                    }
                    self.AddOperation(o);
                });
            };
        },
        Operation: function (vm, text, command, validator, params) {
            var self = this;
            //
            self.Name = text;
            self.Command = command;
            self.Validator = validator;
            //
            self.IsVisible = ko.computed(function () {
                if (!self.Validator || !vm)
                    return false;
                else
                    return self.Validator(vm.SelectedRows());
            });
        }
    }
    return module;
});