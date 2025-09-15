define(['knockout', 'jquery', 'ajax', 'imList'], function (ko, $, ajaxLib, imLib) {
    var module = {
        //сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
        LinkList: function (ko_object, objectClassID, ajaxSelector, readOnly_object, canEdit_object) {
            var lself = this;
            //
            lself.isLoaded = ko.observable(false);//факт загруженности данных для объекта ko_object()
            lself.imList = null;//declared below
            lself.ajaxControl = new ajaxLib.control();//единственный ajax для этого списка
            //
            lself.CheckData = function () {//функция загрузки списка (грузится только раз)
                var returnD = $.Deferred();
                if (!lself.isLoaded()) {
                    $.when(lself.imList.Load()).done(function () {
                        lself.isLoaded(true);
                        returnD.resolve();
                    });
                }
                return returnD.promise();
            };
            lself.ClearData = function () {//функция сброса данных
                lself.imList.List([]);
                //
                lself.isLoaded(false);
            };
            //
            lself.IsExpanded = ko.observable(true);
            lself.ExpandCollapseClick = function () {
                lself.IsExpanded(!lself.IsExpanded());
            };
            //
            var imListOptions = {};//параметры imList для списка 
            {
                imListOptions.aliasID = 'ID';
                //
                imListOptions.LoadAction = function () {
                    var data = {
                        'ID': ko_object().ID(),
                        'EntityClassId': objectClassID
                    };
                    var retvalD = $.Deferred();
                    lself.ajaxControl.Ajax($(ajaxSelector),
                        {
                            dataType: "json",
                            method: 'GET',
                            data: data,
                            url: 'sdApi/GetAssetList'
                        },
                        function (newVal) {
                            if (newVal && newVal.Result === 0) {
                                var assetList = newVal.List;
                                if (assetList) {
                                    require(['models/SDForms/AssetReference'], function (assetLib) {
                                        var retval = [];
                                        ko.utils.arrayForEach(assetList, function (item) {
                                            retval.push(new assetLib.Asset(lself.imList, item));
                                        });
                                        retvalD.resolve(retval);
                                    });
                                }
                                else {
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.AssetReferenceList.js, LoadAction]', 'error');
                                    });
                                    retvalD.resolve([]);
                                }
                            }
                            else
                                require(['sweetAlert'], function () {
                                    swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.AssetReferenceList.js, LoadAction]', 'error');
                                    retvalD.resolve([]);
                                });
                        });
                    return retvalD.promise();
                };
            }
            lself.imList = new imLib.IMList(imListOptions);
            //
            lself.ReadOnly = readOnly_object;//флаг только чтение
            lself.CanEdit = canEdit_object;//флаг для редактирования/создания
            //
            lself.ShowObjectForm = function (obj) {//отображает форму элемента списка
                showSpinner();
                require(['assetForms'], function (module) {
                    var fh = new module.formHelper(true);
                    fh.ShowAssetForm(obj.ID, obj.ClassID());
                });
            };
        }
    };
    return module;
});