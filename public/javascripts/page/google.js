$(function(){
    $('.finalfile').click(function(){
        $('#fileaction').fadeIn(240);
        var id = $(this).attr('id');
        var name = $(this).data('name');
        var mime = $(this).attr('data-mime');
        $('#fileaction').children().find('.download').unbind('click');
        $('#fileaction').children().find('.delete').unbind('click');
        $('#fileaction').children().find('.download').click(function(){
            UIkit.modal.confirm('Do you want to download '+name+'?', function(){ 
                var data = new Array();
                data.push({name:'token', value: id});
                data.push({name:'filename', value: name});
                data.push({name:'mime', value: mime});
                downloadfile(data);
            });
        });
        $('#fileaction').children().find('.delete').click(function(){
            UIkit.modal.confirm('Do you really want to delete '+name+'?', function(){ 
                var data = new Array();
                data.push({name:'token', value: id});
                data.push({name:'filename', value: name});
                data.push({name:'mime', value: mime});
                deletefile(data)
            });
        });
    });
});

function dataSubmit(url, data, btn_elem, callback)
{
	if(btn_elem != false) {
		var html = btn_elem.html();
		btn_elem.html('Processing...'); 
		btn_elem.attr('disabled','disabled');
	}
	$.ajax({
		url : url,
		type : 'POST',
		data: data,
        dataType: 'json',
		beforeSend: function() {
		
		},	
		complete: function() {
			if(btn_elem != false) {
				btn_elem.removeAttr('disabled');
				btn_elem.html(html);
			}
		},
		success: function(json) {
			callback(json);			
		},
		error: function() {
			
		}
	});
}

function downloadfile(data) {
	UIkit.modal("#spinner_dialogue",{bgclose:false}).show();
	dataSubmit('/account/googledownlaod', data, false, checkfiledownload);
}

function checkfiledownload(data) {
	if(data.success === 1) {
		UIkit.modal("#spinner_dialogue").hide();
		var filedata=data.filename;
  		$('<form action="/account/download" method="POST">' + '<input type="hidden" name="file" value="' + data.filename+ '">' + '</form>').appendTo('body').submit();
  	} else {
  		UIkit.modal("#spinner_dialogue").hide();
		UIkit.notify({
		    message : 'Error while downloading file',
		    status  : 'danger',
		    timeout : 5000,
		    pos     : 'top-center'
		});
  	}
}

function deletefile(data) {
	UIkit.modal("#spinner_dialogue",{bgclose:false}).show();
	dataSubmit('/account/googledelete', data, false, filedelete);
}

function filedelete(data) {
	if (data.success === 1) {
		UIkit.modal("#spinner_dialogue").hide();
		removeTreeNode(data.token);
		UIkit.notify({
		    message : 'File deleted successfully',
		    status  : 'success',
		    timeout : 5000,
		    pos     : 'top-center'
		});
	} else {
		UIkit.modal("#spinner_dialogue").hide();
		UIkit.notify({
		    message : 'Error while deleting file',
		    status  : 'danger',
		    timeout : 5000,
		    pos     : 'top-center'
		});
	}
}