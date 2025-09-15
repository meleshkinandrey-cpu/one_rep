define(['knockout', 'jquery', 'ajax', 'imList'], function (ko, $, ajaxLib, imLib) {
	var module = {
		//сущность knockout, идентификатор класса сущности, селектор ajax-крутилки
		KBAReferenceList: function (ko_object, objectClassID, ajaxSelector, readOnly_obj, isClient_obj) {
			var lself = this;
			//
			lself.isLoaded = ko.observable(false);//факт загруженности данных для объекта ko_object()
			lself.imList = null;//declared below
			lself.ajaxControl = new ajaxLib.control();
			lself.ajaxControl_add = new ajaxLib.control();
			lself.ajaxControl_remove = new ajaxLib.control();
			//
			lself.CheckData = function () {//функция загрузки списка (грузится только раз)
				if (!lself.isLoaded()) {
					$.when(lself.imList.Load()).done(function () {
						lself.isLoaded(true);
					});
				}
			};
			lself.ClearData = function () {//функция сброса данных
				lself.imList.List([]);
				//
				lself.isLoaded(false);
			};
		    //
			lself.PushData = function (list) {//функция загрузки списка 
			    var returnD = $.Deferred();
			    $.when(lself.imList.Push(list)).done(function () {
			        returnD.resolve();
			    });
			    return returnD.promise();
			};
            //
			lself.ReadOnly = readOnly_obj;//флаг только чтение, already observable
			lself.IsClient = isClient_obj;//флаг только чтение, already observable
			//
			lself.ItemsCount = ko.computed(function () {
				var retval = 0;
				if (lself.isLoaded())
					retval = lself.imList.List().length;
				//
				if (retval <= 0)
					return null;
				if (retval > 99)
					return '99';
				else return '' + retval;
			});
		    //
			lself.ShowObjectForm = function (kba) {
			    require(['usualForms'], function (module) {
					var fh = new module.formHelper(true);
					fh.ShowKBAView(kba.ID);
				});
			};
			//
			lself.RemoveKBAReference = function (kba, event) {
				lself.ajaxControl_remove.Ajax($(ajaxSelector),
                                    {
                                    	dataType: 'json',
                                    	url: 'sdApi/EditKBReference',
                                    	method: 'POST',
                                    	data: {
                                    		Operation: 2, //remove
                                    		KBArticleID: kba.ID,
                                    		ObjectID: ko_object().ID(),
                                    		ObjectClassID: objectClassID
                                    	}
                                    },
                                    function (result) {
                                    	if (result !== 0) {
                                    		swal(getTextResource('GlobalError'), getTextResource('AjaxError') + '\n[SDForm.KBAReferenceList.js, AddKBAReference]', 'error');
                                    	}
                                    	else
                                    	{
                                    		if (lself.isLoaded())
                                    			lself.imList.TryRemoveByID(kba.ID);
                                    	}
                                    });
			};
			//
			lself.AddKBAReference = function (kba) {
				var retD = $.Deferred();
				//
				var exist = ko.utils.arrayFirst(lself.imList.List(), function (el) { return el.ID == kba.ID; });
				if (exist) {
					retD.resolve(false);
					return retD.promise();
				}
				//
				var temp = {
					Id: kba.ID,
					Name: kba.Name
				};
				//
				require(['ui_lists/KB/KBArticle.Short'], function (kbsLib) {
					lself.imList.List.push(new kbsLib.KBArticle(temp));
					lself.imList.List.valueHasMutated();
				});
				//
				lself.ajaxControl_add.Ajax($(ajaxSelector),
                                    {
                                    	dataType: 'json',
                                    	url: 'sdApi/EditKBReference',
                                    	method: 'POST',
                                    	data: {
                                    		Operation: 1, //add
                                    		KBArticleID: kba.ID,
                                    		ObjectID: ko_object().ID(),
                                    		ObjectClassID: objectClassID
                                    	}
                                    },
                                    function (result) {
                                    	if (result !== 0) {
                                    		swal(getTextResource('GlobalError'), getTextResource('AjaxError') + '\n[SDForm.KBAReferenceList.js, AddKBAReference]', 'error');
                                    		retD.resolve(false);
                                    	}
                                    	else {
                                    		retD.resolve(true);
                                    	}
                                    });
				//
				return retD.promise();
			};
			//
			var imListOptions = {};//параметры imList для списка 
			{
				imListOptions.aliasID = 'ID';
				//
				imListOptions.LoadAction = function () {
					var data = {
						'objectID': ko_object().ID(),
						'objectClassID': objectClassID,
						'seeInvisible': !lself.IsClient()
					};
					var retvalD = $.Deferred();
					lself.ajaxControl.Ajax($(ajaxSelector),
                        {
                        	dataType: "json",
                        	method: 'GET',
                        	data: data,
                        	url: 'sdApi/getKBAReferenceList'
                        },
                        function (newVal) {
                        	if (newVal && newVal.Result === 0) {
                        		var kbrList = newVal.List;
                        		if (kbrList) {
									require(['ui_lists/KB/KBArticle.Short'], function (kbsLib) {
                        				var retval = [];
                        				ko.utils.arrayForEach(kbrList, function (item) {
                        					retval.push(new kbsLib.KBArticle(item));
                        				});
                        				retvalD.resolve(retval);
                        			});
                        		}
                        		else {
                        			require(['sweetAlert'], function () {
                        				swal(getTextResource('ErrorCaption'), getTextResource('AjaxError') + '\n[SDForm.KBAReferenceList.js, LoadAction]', 'error');
                        			});
                        			retvalD.resolve([]);
                        		}
                        	}
                        	else if (newVal && newVal.Result === 1)
                        		require(['sweetAlert'], function () {
                        			swal(getTextResource('ErrorCaption'), getTextResource('NullParamsError') + '\n[SDForm.KBAReferenceList.js, LoadAction]', 'error');
                        			retvalD.resolve([]);
                        		});
                        	else if (newVal && newVal.Result === 2)
                        		require(['sweetAlert'], function () {
                        			swal(getTextResource('ErrorCaption'), getTextResource('BadParamsError') + '\n[SDForm.KBAReferenceList.js, LoadAction]', 'error');
                        			retvalD.resolve([]);
                        		});
                        	else
                        		require(['sweetAlert'], function () {
                        			swal(getTextResource('ErrorCaption'), getTextResource('GlobalError') + '\n[SDForm.KBAReferenceList.js, LoadAction]', 'error');
                        			retvalD.resolve([]);
                        		});
                        });
					return retvalD.promise();
				};
			    //
				imListOptions.PushAction = function (list) {
				    if (list) {
				        var retvalD = $.Deferred();
				        require(['models/SDForms/SDForm.KBAReference'], function (kbaLib) {
				            var retval = [];
				            ko.utils.arrayForEach(list, function (item) {
				                retval.push(new kbaLib.KBAReference(lself.imList, item));
				            });
				            retvalD.resolve(retval);
				        });
				    }
				    return retvalD.promise();
				}
			}
			lself.imList = new imLib.IMList(imListOptions);
		}
	};
	return module;
});