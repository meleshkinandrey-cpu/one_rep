define(['jquery'], function ($) {
    var autoCloseRegionList = [];//stored menu regions        
    //
    self.openRegion = function ($region, e, actionOnHide) {
        var exists = false;
        var closeOther = false;
        //
        if (!$region.is(':visible')) {
            $region.show();
            if (e && e.stopPropagation) e.stopPropagation();
            closeOther = true;
        }
        for (var i = 0; i < autoCloseRegionList.length; i++) {
            var $item = autoCloseRegionList[i].region;
            if ($item.is($region)) {
                exists = true;
                if (!closeOther)
                    break;
            }
            else if (closeOther && $item.is(':visible')) {
                $item.hide();
                if (autoCloseRegionList[i].action)
                    autoCloseRegionList[i].action();
            }
        }
        if (!exists) {
            autoCloseRegionList.push({ region: $region, action: actionOnHide });
            $region.click(function (e) {
                e.stopPropagation();
            });
        }
    };
    self.closeRegions = function () {
        var processed = false;
        for (var i = 0; i < autoCloseRegionList.length; i++) {
            var $item = autoCloseRegionList[i].region;
            if ($item.is(':visible')) {
                $item.hide();
                if (autoCloseRegionList[i].action)
                    autoCloseRegionList[i].action();
                processed = true;
            }
        }
        return processed;
    };
    //
    $(document).click(function (e) {
        for (var i = 0; i < autoCloseRegionList.length; i++) {
            var $item = autoCloseRegionList[i].region;
            if ($item.is(':visible') && !$.contains($item[0], e.target)) {
                $item.hide();
                if (autoCloseRegionList[i].action)
                    autoCloseRegionList[i].action();
            }
        }
    });
});