function isInArray(it,arr) {
    return arr.indexOf(it.toLowerCase()) > -1;
}
const keyW = ['for','next','if','then','else','endif','subroutine','endsub','import','wfcreate','call','or','and','to','smpl','freeze','setelem','options','fill','ls','cov', 'rename'];
const keyW2 = ['include','series','group','vector','matrix','graph','equation','string']; // object


function colorCode(node) {
    // var node = document.getElementById('eviews');
    var htmlContent = node.innerHTML;
    var text = htmlContent.split(/(\s|,|\)|\(|{|}|\.)/g);
    var i = 0;
    while (i < text.length) {
	var w = text[i];
	if (w.charAt(0) === "'") {
	    if (w.endsWith('\n')) {
		w = '<span class="comment">' + w + '</span>';
	    } else {
		w = '<span class="comment">' + w;
		text[i] = w;
		while (!w.endsWith('\n')) {
		    i ++;
		    w = text[i];		
		}
		w = w + '</span>';
	    }
	} else if (w.charAt(0) === '"') {
	    if (w.endsWith('"')) {
		w = '<span class="string">' + w + '</span>';
	    } else {
		w = '<span class="string">' + w;
		text[i] = w;
		while (!w.endsWith('"')) {
		    i ++;
		    w = text[i];		
		}
		w = w + '</span>';
	    }
	} else {
	    if (w.charAt(0) === "%" || w.charAt(0) === "!" || w.charAt(0) === "@") {
		w = '<span class="var">' + w + '</span>';
	    } else if (isInArray(w,keyW)) {
		w = '<span class="keyw">' + w + '</span>';
	    } else if (isInArray(w,keyW2)) {
		w = '<span class="keyw2">' + w + '</span>';
	    }
	}
	text[i] = w;
	i ++;
    }
    var htmlContentUpdate = text.join('');
    node.innerHTML = htmlContentUpdate;
}

function getIds() {
    var nodes = document.querySelectorAll("pre#eviews");
    Array.prototype.forEach.call(nodes, function(node,i) {
	colorCode(node);
    });
}


window.onload = getIds ;
