define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        ViewModel: function ($regionPriority, parentSelf, isReadOnly) {
            var vself = this;
            var self = parentSelf;
            vself.LoadD = $.Deferred();
            //
            vself.divID = 'priorityControlWorkOrder_' + ko.getNewID();//main control div.ID
            vself.$region = $regionPriority;
            vself.ReadOnly = ko.observable(isReadOnly);
            vself.IsLoaded = ko.observable(false);
            vself.Initialize = function () {                
                    vself.$region.find('.priority-header').click(vself.HeaderClick);
                    vself.$region.find('.priority-workorder-panel').append('<div id="' + vself.divID + '" data-bind="template: {name: \'Priority/WorkOrderPriority\', afterRender: AfterRender}" ></div>');
                    //
                    try {
                        ko.applyBindings(vself, document.getElementById(vself.divID));
                    }
                    catch (err) {
                        if (document.getElementById(vself.divID))
                            throw err;
                    }
            };
            vself.AfterRender = function () {
                vself.LoadD.resolve();
            };
            //
            vself.BasicPriorityID = ko.observable(null);
            vself.PriorityList = ko.observableArray([]);
            vself.HeaderClick = function (e) {
                if (!vself.ReadOnly()) {
                    openRegion(vself.$region.find('.priority-workorder-panel'), e);
                }
                return true;
            };
            vself.ClosePanel = function () {
                vself.$region.find('.priority-workorder-panel').hide();
            };
            //
            vself.ClassID = null;
            vself.ObjectID = null;
            vself.ajaxControl_load = new ajaxLib.control();
            vself.Load = function (objID, classID, basicPriorityID) {
                vself.BasicPriorityID(basicPriorityID);
                //
                vself.ObjectID = objID;
                vself.ClassID = classID;
                //
                var loadD = $.Deferred();
                //
                $.when(userD, vself.LoadD).done(function (user) {
                    var param = {
                        'ID': vself.ObjectID,
                        'EntityClassId': vself.ClassID,
                    };
                    vself.ajaxControl_load.Ajax(vself.$region,
                        {
                            url: 'sdApi/GetFullPriorityList?' + $.param(param),
                            method: 'GET',
                            dataType: "json"
                        },
                        function (response) {
                            vself.PriorityList.removeAll();
                            //                            
                            if (response) {
                                if (response.Result == 0) {//success
                                    if (response.PriorityList) {
                                        ko.utils.arrayForEach(response.PriorityList, function (el) {
                                            if (el && (el.Removed == false || el.ID == vself.BasicPriorityID()))
                                                vself.PriorityList.push(new module.Priority(vself, el));
                                        });
                                        //
                                        vself.PriorityList.valueHasMutated();
                                    }
                                    //
                                    loadD.resolve(true);
                                }
                                else if (response.Result === 1)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[WorkOrderPriority.js, Load]', 'error');
                                        loadD.resolve(false);
                                    });
                                else if (response.Result === 2)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[WorkOrderPriority.js, Load]', 'error');
                                        loadD.resolve(false);
                                    });
                                else if (response.Result === 3)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                        loadD.resolve(false);
                                    });
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[WorkOrderPriority.js, Load]', 'error');
                                        loadD.resolve(false);
                                    });
                            }
                            vself.IsLoaded(true);
                        });
                });
                //
                return loadD.promise();
            };
            //
            vself.CheckCurrentPriority = function (priority) {
                if (priority != null)
                    return priority.ID == vself.BasicPriorityID();
                else return false;
            };
            //
            vself.ajaxControl_edit = new ajaxLib.control();
            vself.SelectPriority = function (priority) {
                if (vself.ReadOnly() || priority == null)
                    return;
                //
                if (priority.ID == vself.BasicPriorityID())
                    return;
                //
                if (vself.ObjectID == null) {
                    vself.BasicPriorityID(priority.ID);
                    //
                    vself.ClosePanel();
                    self.RefreshPriority(priority);                    
                    return;
                }
                //
                $.when(userD).done(function (user) {
                    vself.ajaxControl_edit.Ajax(vself.$region,
                        {
                            dataType: 'json',
                            url: 'sdApi/EditWorkOrderPriority',
                            method: 'POST',
                            data: {
                                ObjectID: vself.ObjectID,
                                ObjectClassID: vself.ClassID,
                                PriorityID: priority.ID
                            }
                        },
                        function (result) {
                            if (result === 0)
                            {
                                vself.BasicPriorityID(priority.ID);
                                //
                                vself.ClosePanel();
                                self.RefreshPriority(priority);
                            }
                            else if (result === 6)
                            {
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('EditPriorityCaption'), getTextResource('ObjectDeleted'), 'error');
                                });
                            }
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('EditPriorityCaption'), getTextResource('AjaxError') + '\n[WorkOrderPriority.js, SelectPriority]', 'error');
                                });
                        });
                });
            };
        },
        Priority: function (parentSelf, obj) {
            var pself = this;
            var vself = parentSelf;
            //
            pself.ID = obj.ID;
            pself.Name = obj.Name;
            pself.Sequence = obj.Sequence;
            pself.Color = obj.Color;
            pself.Default = obj.Default;
        }
    };
    return module;
});