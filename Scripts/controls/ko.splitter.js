define(['jquery', 'knockout', 'ajax'], function ($, ko, ajaxLib) {
	//
	var resizeDirections = {
		vertical: 'vertical',
		horizont: 'horizont'
	};
	var resizeTumbHor = '<div class="resizeTumbHor"></div>';
	var resizeTumbVer = '<div class="resizeTumbVer"></div>';
	//
	ko.bindingHandlers.splitter = {
		update: function (element, valueAccessor, allBindings) {
			var value = ko.utils.unwrapObservable(valueAccessor());
			//
			if (!value.ChangeFunc || !value.Direction)
				return;
			//
			var sizeChangeFunction = value.ChangeFunc;
			var minimalSize = value.MinimalSize ? value.MinimalSize : 0;
			var maximumSize = value.MaximumSize;
			var nameForSave = value.Name;
			var resizeDirection = value.Direction == 'bottom' || value.Direction == 'top' ? resizeDirections.vertical : resizeDirections.horizont;
			//
			var innerDocument = null;
			var innerDocumentOffetY = null;
			if (value.DocumentInfo) {
				innerDocument = value.DocumentInfo.Document;//ko.observable. чтобы подписаться на события мыши, если используется iframe
				innerDocumentOffetY = value.DocumentInfo.OffsetY;//координата Y верхней точки innerDocument относительно основного окна
            }
			//
			var $resizingObj = $(element);
			
			if (!nameForSave || nameForSave == '')
				nameForSave = $resizingObj.attr("class");
			//
			if ($resizingObj.length == 0 || !nameForSave || nameForSave == '')
				return;
			//
			var objectOfResize = ko.observable(null);
			var ajaxControl = new ajaxLib.control();
			//
			var syncTimeout = null;
			var syncD = null;
			var saveFunc = function (newDistance) {
				var d = syncD;
				if (d == null || d.state() == 'resolved') {
					d = $.Deferred();
					syncD = d;
				}
				//
				if (syncTimeout)
					clearTimeout(syncTimeout);
				//
				syncTimeout = setTimeout(function () {
					if (d == syncD) {
						$.when(saveFuncPrivate(newDistance)).done(function () {
							d.resolve();
						});
					}
				}, 1000);
				//
				return d.promise();
			};
			var saveFuncPrivate = function (newDistance) {
				var d = $.Deferred();
				//
				var param = {
					splitterName: nameForSave,
					distance: parseInt(newDistance)
				};
				ajaxControl.Ajax(null,
                    {
                    	url: 'accountApi/SetSplitterSettings?' + $.param(param),
                    	method: 'POST'
                    },
                    function (response) {
                    	if (response != 0) {
                    		require(['sweetAlert'], function () {
                    			swal(getTextResource('SaveError'), getTextResource('AjaxError') + '\n[ko.splitter.js, saveFunc]', 'error');
                    		});
                    	}
                    	d.resolve();
                    });
				return d.promise();
			};
			var getFunc = function () {
				var d = $.Deferred();
				//
				var param = {
					splitterName: nameForSave
				};
				ajaxControl.Ajax(null,
                    {
                    	url: 'accountApi/GetSplitterSettings?' + $.param(param),
                    	method: 'GET'
                    },
                    function (response) {
                    	if (response && response.Distance > 0) {
                    		d.resolve(response.Distance)
                    	}
                    	else d.resolve(0);
                    });
				return d.promise();
			};
			//
			$.when(getFunc()).done(function (newValue) {
				var newSize = Math.min(Math.max(newValue, minimalSize), maximumSize);
				sizeChangeFunction(newSize);
				//
				if (newSize != newValue)
					saveFunc(newSize);
			});
			//
			if (resizeDirection == resizeDirections.horizont)
			{
				$resizingObj.append(resizeTumbHor);
				var $tumb = $resizingObj.children('.resizeTumbHor');
				//
				$tumb.hover(
					function () {
						$(this).addClass('tumbGray');
					},
					function () {
						$(this).removeClass('tumbGray');
					});
				//
				var mouseupHandler = function(e) {
					if (objectOfResize() != null) {
						$(document).unbind('mouseup', mousemoveHandler);
						objectOfResize(null);
						$(document).unbind('mouseup', mouseupHandler);
						document.body.style.cursor = "auto";
					}
				};
				var mousemoveHandler = function (e) { 
					if (objectOfResize() != null) {
						var dx = e.pageX - objectOfResize().startX;
						var newSize = Math.min(Math.max(objectOfResize().startWidth + dx, minimalSize), maximumSize);
						sizeChangeFunction(newSize);
						saveFunc(newSize);
					}
				};
				$tumb.mousedown(function (e) {
					if (e.which == 1 && objectOfResize() == null) {
						objectOfResize({ startX: e.pageX, startWidth: $resizingObj.width() });
						document.body.style.cursor = "e-resize";
						$(document).bind('mouseup', mouseupHandler);
						$(document).bind('mousemove', mousemoveHandler);
					}
				});
			}
			else
			{
				$resizingObj.append(resizeTumbVer);
				var $tumb = $resizingObj.children('.resizeTumbVer');
				//
				$tumb.hover(
					function () {
						$(this).addClass('tumbGray');
					},
					function () {
						$(this).removeClass('tumbGray');
					});
				//
				var mouseupHandler = function (e) {
					if (objectOfResize() != null) {
						$(document).unbind('mouseup', mousemoveHandler);
						objectOfResize(null);
						$(document).unbind('mouseup', mouseupHandler);
						document.body.style.cursor = "auto";
					}
				};
				var mousemoveHandler = function (e) {
					if (objectOfResize() != null) {
						var dy = e.pageY - objectOfResize().startY;

						if (dy < 0) {
							console.log(dy);
                        }

						var newSize = Math.min(Math.max(objectOfResize().startHeight + dy, minimalSize), maximumSize);
						sizeChangeFunction(newSize);
						saveFunc(newSize);
					}
				};
				var mouseupHandlerInner = function (e) {
					if (objectOfResize() != null) {
						$(innerDocument()).unbind('mouseup', mouseupHandlerInner);
						objectOfResize(null);
						$(innerDocument()).unbind('mouseup', mousemoveHandlerInner);
						innerDocument().body.style.cursor = "auto";
					}
				};
				var mousemoveHandlerInner = function (e) {
					if (objectOfResize() != null) {
						var dy = innerDocumentOffetY + e.pageY - objectOfResize().startY;

						if (dy < 0) {
							console.log(dy);
						}

						var newSize = Math.min(Math.max(objectOfResize().startHeight + dy, minimalSize), maximumSize);
						sizeChangeFunction(newSize);
						saveFunc(newSize);
					}
				};
				$tumb.mousedown(function (e) {
					if (e.which == 1 && objectOfResize() == null) {
					    objectOfResize({ startY: e.pageY, startHeight: $resizingObj.height() });
						document.body.style.cursor = "s-resize";
						$(document).bind('mouseup', mouseupHandler);
						$(document).bind('mousemove', mousemoveHandler);
						//
						if (innerDocument && innerDocument()) {
							$(innerDocument()).bind('mouseup', mouseupHandlerInner);
							$(innerDocument()).bind('mousemove', mousemoveHandlerInner);
						}
					}
				});
			}
		}
	};
});