define(['knockout', 'jquery', 'ttControl', 'ajax'], function (ko, $, tclib, ajaxLib) {
    var module = {
        ViewModel: function ($regionPriority, parentSelf, isReadOnly) {
            var vself = this;
            var self = parentSelf;
            vself.LoadD = $.Deferred();
            //
            vself.divID = 'priorityControl_' + ko.getNewID();//main control div.ID
            vself.$region = $regionPriority;
            vself.ReadOnly = ko.observable(isReadOnly);
            vself.IsLoaded = ko.observable(false);
            vself.Initialize = function () {
                    vself.$region.find('.priority-header').click(vself.HeaderClick);
                    vself.$region.find('.priority-panel').append('<div id="' + vself.divID + '" data-bind="template: {name: \'Priority/Priority\', afterRender: AfterRender}" ></div>');
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
            vself.CurrentInfluenceID = ko.observable();
            vself.CurrentUrgencyID = ko.observable();
            vself.BasicPriorityID = null;
            //
            vself.PriorityList = ko.observableArray([]);
            vself.InfluenceList = ko.observableArray([]);
            vself.UrgencyList = ko.observableArray([]);
            vself.ConcordanceList = ko.observableArray([]);
            //
            vself.HeaderClick = function (e) {
                if (!vself.ReadOnly()) {
                    openRegion(vself.$region.find('.priority-panel'), e);
                }
                return true;
            };
            vself.ClosePanel = function () {
                vself.$region.find('.priority-panel').hide();
            };
            //
            vself.ClassID = null;
            vself.ObjectID = null;
            //
            vself.ajaxControl_load = new ajaxLib.control();
            vself.Load = function (objID, classID, urgencyID, influenceID, basicPriorityID) {
                vself.CurrentInfluenceID(influenceID);
                vself.CurrentUrgencyID(urgencyID);
                vself.BasicPriorityID = basicPriorityID;
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
                            vself.InfluenceList.removeAll();
                            vself.UrgencyList.removeAll();
                            vself.ConcordanceList.removeAll();
                            //
                            vself.IsLoaded(true);
                            if (response) {
                                if (response.Result == 0) {//success
                                    if (response.PriorityList) {
                                        ko.utils.arrayForEach(response.PriorityList, function (el) {
                                            if (el && (el.Removed == false || el.ID == vself.BasicPriorityID))
                                                vself.PriorityList.push(new module.Priority(vself, el));
                                        });
                                        //
                                        vself.PriorityList.valueHasMutated();
                                    }
                                    //
                                    if (response.InfluenceList) {
                                        ko.utils.arrayForEach(response.InfluenceList, function (el) {
                                            vself.InfluenceList.push(new module.Influence(vself, el));
                                        });
                                        //
                                        vself.InfluenceList.valueHasMutated();
                                    }
                                    //
                                    if (response.UrgencyList) {
                                        ko.utils.arrayForEach(response.UrgencyList, function (el) {
                                            vself.UrgencyList.push(new module.Urgency(vself, el));
                                        });
                                        //
                                        vself.UrgencyList.valueHasMutated();
                                    }
                                    //
                                    if (response.ConcordanceList) {
                                        ko.utils.arrayForEach(response.ConcordanceList, function (el) {
                                            vself.ConcordanceList.push(new module.Concordance(vself, el));
                                        });
                                        //
                                        vself.ConcordanceList.valueHasMutated();
                                    }
                                    //
                                    loadD.resolve(true);
                                }
                                else if (response.Result === 1)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[Priority.js, Load]', 'error');
                                        loadD.resolve(false);
                                    });
                                else if (response.Result === 2)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[Priority.js, Load]', 'error');
                                        loadD.resolve(false);
                                    });
                                else if (response.Result === 3)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                                        loadD.resolve(false);
                                    });
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[Priority.js, Load]', 'error');
                                        loadD.resolve(false);
                                    });
                            }
                        });
                });
                //
                return loadD.promise();
            };
            //
            vself.CheckSelectedUrgency = function (urgency) {
                if (urgency.ID == vself.CurrentUrgencyID())
                    return true;
                else return false;
            };
            vself.CheckSelectedInfluence = function (influence) {
                if (influence.ID == vself.CurrentInfluenceID())
                    return true;
                else return false;
            };
            //
            vself.CheckColor = function (influence, urgency) {
                var priority = vself.FindPriority(influence, urgency);
                if (priority != null)
                    return priority.Color;
                else return null;
            };
            //
            vself.CheckClass = function (influence, urgency) {
                var retval = '';
                var priority = vself.FindPriority(influence, urgency);
                if (priority != null && priority.Color != '')
                    retval = '';
                else retval = 'b-priority-table__label-empty';
                //
                if (influence != null && urgency != null && priority != null) {
                    if (influence.ID == vself.CurrentInfluenceID() && urgency.ID == vself.CurrentUrgencyID() && priority.ID == vself.BasicPriorityID)
                        retval += ' b-priority-table__label-current';
                }
                //
                return retval;
            };
            //
            vself.FindPriority = function (influence, urgency) {
                if (influence != null && urgency != null) {
                    var concordance = ko.utils.arrayFirst(vself.ConcordanceList(), function (el) {
                        return (el.UrgencyID == urgency.ID && el.InfluenceID == influence.ID);
                    });
                    if (concordance == null)
                        return null;
                    else {
                        return ko.utils.arrayFirst(vself.PriorityList(), function (el) {
                            return (el.ID == concordance.PriorityID);
                        });
                    }
                }
                else return null;
            };
            //
            vself.ajaxControl_edit = new ajaxLib.control();
            vself.SelectPriority = function (influence, urgency) {
                if (vself.ReadOnly() || influence == null || urgency == null)
                    return;
                //
                if (influence.ID == vself.CurrentInfluenceID() && urgency.ID == vself.CurrentUrgencyID())
                    return;
                //
                var priority = vself.FindPriority(influence, urgency);
                if (priority != null) {
                    if (vself.ObjectID == null) {
                        vself.CurrentUrgencyID(urgency.ID);
                        vself.CurrentInfluenceID(influence.ID);
                        vself.BasicPriorityID = priority.ID;
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
                                url: 'sdApi/EditPriority',
                                method: 'POST',
                                data: {
                                    ObjectID: vself.ObjectID,
                                    ObjectClassID: vself.ClassID,
                                    PriorityID: priority.ID,
                                    InfluenceID: influence.ID,
                                    UrgencyID: urgency.ID,
                                }
                            },
                            function (result) {
                                if (result === 0) {
                                    vself.CurrentUrgencyID(urgency.ID);
                                    vself.CurrentInfluenceID(influence.ID);
                                    vself.BasicPriorityID = priority.ID;
                                    //
                                    vself.ClosePanel();
                                    self.RefreshPriority(priority);
                                }
                                else if (result === 6) {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('EditPriorityCaption'), getTextResource('ObjectDeleted'), 'error');
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('EditPriorityCaption'), getTextResource('AjaxError') + '\n[Priority.js, SelectPriority]', 'error');
                                    });
                                }
                            });
                    });
                }
            };
            //
            vself.CheckShowTooltipPriority = function (influence, urgency, data, event) {
                if (data && event) {
                    var $this = $(event.currentTarget);
                    //
                    var priority = vself.FindPriority(influence, urgency);
                    if (priority != null) {
                        var ttcontrol = new tclib.control();
                        var tt = ttcontrol.init($this, { text: priority.Name, side: 'top', showImmediat: true });
                    }
                }
                return true;
            };
        },
        Priority: function (parentSelf, obj) { //Приоритет
            var pself = this;
            var vself = parentSelf;
            //
            pself.ID = obj.ID;
            pself.Name = obj.Name;
            pself.Sequence = obj.Sequence;
            pself.Color = obj.Color;
            pself.Default = obj.Default;
        },
        Influence: function (parentSelf, obj) { //Влияние
            var iself = this;
            var vself = parentSelf;
            //
            iself.ID = obj.ID;
            iself.Name = obj.Name;
            iself.Sequence = obj.Sequence;
        },
        Urgency: function (parentSelf, obj) { //Срочность
            var uself = this;
            var vself = parentSelf;
            //
            uself.ID = obj.ID;
            uself.Name = obj.Name;
            uself.Sequence = obj.Sequence;
        },
        Concordance: function (parentSelf, obj) {
            var cself = this;
            var vself = parentSelf;
            //
            cself.UrgencyID = obj.UrgencyID;
            cself.InfluenceID = obj.InfluenceID;
            cself.PriorityID = obj.PriorityID;
        }
    };
    return module;
});