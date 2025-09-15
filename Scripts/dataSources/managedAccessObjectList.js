define(['knockout', 'jquery', 'ajax'], function (ko, $, ajaxLib) {
    var module = {
        dataSource: function (apiUrl, map) {
            var self = this;
            var loader = new ajaxLib.control();

            self.items = ko.observableArray();
            self.allowAdd = false;
            self.newObject = null;

            self.load = function ($region) {
                var retD = $.Deferred();

                loader.Ajax($region,
                {
                    dataType: "json",
                    method: 'GET',
                    url: apiUrl
                },
                function (newVal) {
                    if (newVal && newVal.Result === 0) {
                        var data = newVal.Data;
                        if (data) {
                            self.allowAdd = data.AllowAdd;
                            self.newObject = data.NewObject;
                            self.items.removeAll();
                            ko.utils.arrayForEach(data.Objects, function (el) {
                                var dataItem = map(el.ObjectData);

                                dataItem.allowEdit = el.AllowEdit;
                                dataItem.allowDelete = el.AllowDelete;
                                dataItem.canBeEdited = el.CanBeEdited;
                                dataItem.canBeDeleted = el.CanBeDeleted;

                                self.items.push(dataItem);
                            });
                        }
                        retD.resolve();
                    }
                    else if (newVal && newVal.Result === 1)
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[managedAccessibleObjectList.js, load]', 'error');
                        });
                    else if (newVal && newVal.Result === 2)
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[managedAccessibleObjectList.js, load]', 'error');
                        });
                    else if (newVal && newVal.Result === 3)
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                        });
                    else
                        require(['sweetAlert'], function () {
                            swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[managedAccessibleObjectList.js, load]', 'error');
                        });
                    });

                return retD.promise();
            }
        }
    };

    return module;
});