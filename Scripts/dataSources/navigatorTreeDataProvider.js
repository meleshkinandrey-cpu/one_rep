define(['jquery', 'ajax'], function ($, ajaxLib) {
    var module = {
        DataProvider: function (options) {
            var self = this;

            var ajaxLoader = new ajaxLib.control();

            function buildParameters() {
                return {
                    Type: options.type,
                    AvailableCategoryID: options.AvailableCategoryID,
                    UseRemoveCategoryClass: options.UseRemoveCategoryClass,
                    RemovedCategoryClassArray: options.RemovedCategoryClassArray,
                    AvailableTypeID: options.AvailableTypeID,
                    AvailableTemplateClassID: options.AvailableTemplateClassID,
                    AvailableTemplateClassArray: options.AvailableTemplateClassArray,
                    HasLifeCycle: options.HasLifeCycle,
                    CustomControlObjectID: options.CustomControlObjectID,
                    SetCustomControl: options.SetCustomControl
                };
            }

            function getData(data, url) {
                var retD = $.Deferred();

                ajaxLoader.Ajax($(options.region),
                    {
                        dataType: "json",
                        method: 'GET',
                        data: data,
                        url: url || 'navigatorApi/GetTreeNodes'
                    },
                    function (newVal) {
                        if (newVal && newVal.Result === 0) {
                            retD.resolve(newVal.List);
                        }
                        else if (newVal && newVal.Result === 1)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[treeControl.js, Load]', 'error');
                            });
                        else if (newVal && newVal.Result === 2)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[treeControl.js, Load]', 'error');
                            });
                        else if (newVal && newVal.Result === 3)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('AccessError'), 'error');
                            });
                        else
                            require(['sweetAlert'], function () {
                                swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[treeControl.js, Load]', 'error');
                            });
                    });

                return retD.promise();
            }

            self.getRoots = function () {
                return getData(buildParameters());
            };
            self.getChildrenOf = function (node) {
                var data = buildParameters();
                data.ID = node.id;
                data.ClassID = node.classId;
                data.AvailableClassID = options.AvailableClassArray || [];
                data.UseAccessIsGranted = options.UseAccessIsGranted;
                data.OperationsID = options.OperationsID || [];

                return getData(data);
            };
            self.getPath = function (id, classId) {
                var data = {
                    id: id,
                    classId: classId,
                    type: options.type
                };

                return getData(data, 'navigatorApi/GetPathToNode');
            }
        }
    };

    return module;
});