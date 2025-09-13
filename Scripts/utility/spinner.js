(function () {
    var spinnerArray = []; //{Spinner, Element, Count}

    //show wait spinner on body or element (set as non clickable)
    self.showSpinner = function (target) {
        var tmp = null;
        for (var i = 0; i < spinnerArray.length; i++)
            if (spinnerArray[i].Element === target) {
                tmp = spinnerArray[i];
                break;
            }
        if (tmp != null) {
            tmp.Count = tmp.Count + 1;
            return;
        }
        //
        var spinConfig = {
            lines: 17,
            length: 0,
            width: 5,
            radius: 14,
            scale: 1.00,
            corners: 1.0,
            opacity: 0.1
        };
        if (target) {
            var bounds = target.getBoundingClientRect();
            if (bounds.height > 0 && bounds.width > 0) {
                var hMax = Math.min(bounds.height, bounds.width);
                var hSpin = 2 * (spinConfig.width + spinConfig.radius) + 10;
                if (hSpin > hMax)
                    spinConfig.scale = hMax / hSpin;
            }
            //
            spinner = new Spinner(spinConfig).spin(target);
            spinnerArray.push({ Spinner: spinner, Element: target, Count: 1 });
            //
            target.className += ' ajaxElement';
        } else {
            spinner = new Spinner(spinConfig).spin();
            spinnerArray.push({ Spinner: spinner, Element: target, Count: 1 });
            document.body.appendChild(spinner.el);
            //
            var div = document.createElement('div');
            div.id = 'mainSpinner';
            div.className = 'themodal-overlay';
            document.body.appendChild(div);
        }
    };

    //hide wait spinner on body or element (set non clickable)
    self.hideSpinner = function (target) {
        var tmp = null;
        var index = -1;
        for (var i = 0; i < spinnerArray.length; i++)
            if (spinnerArray[i].Element === target) {
                tmp = spinnerArray[i];
                index = i;
                break;
            }
        if (tmp == null)
            return;
        else if (tmp.Count > 1) {
            tmp.Count = tmp.Count - 1;
            return;
        }
        //
        tmp.Spinner.stop();
        spinnerArray.splice(index, 1);
        //
        if (target) {
            target.className = target.className.replace('ajaxElement', '');
        }
        else {
            var div = document.getElementById('mainSpinner');
            if (div && div.parentNode)
                div.parentNode.removeChild(div);
        }
    };
})(this);