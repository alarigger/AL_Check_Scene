/****************************** C H E C K    S C E N E **************************
/*Version du 18/12/2020

V 2

don't use embeded pivot 
et separate coords. 


 Alexandre Cormier*/
/*www.alarigger.com*/
/*

limite le script à un groupe selectionne

*/

function AL_Check_Scene() {

    /*VARIABLES*/

    var cf = frame.current();
    var root_node = "";
    var relevent_types = ["READ", "COMPOSITE", "PEG"];
    var nodes_to_treat = [];
    var fix_list = []
    var exclusionList= []
	
	var TARGET = "GROUP";

    var substituions_tab = {
        columns: [],
        drawings: [],
        substitions: []
    }

    var scene_drawings =[];
	var scene_composites =[];
	var scene_pegs =[];
	var scene_MC =[];
    var Final_message = "Repport : \n";
    var drawing_repport = "BAD DRAWINGS : ";
    var message_bad_mc_list = "BAD MC \n";
    var final_regex = /\b-GUIDE|\bGUI|\bTIGE_paupiere|\bOMBRE/g;
    var OVEWRITE_KEYS = false;

    /*FIX VAR*/

    var available_fixes_list = [];
    var available_types_list = [];

    var selected_types = [];
    var selected_fixes = [];

    var typeBoxes = []
    var fixBoxes = []

    var fix_count = {}
    var type_count = {}

    /*EXECUTION*/

    MessageLog.trace("-------AL_Check_Scene-------");
    scene.beginUndoRedoAccum("AL_Check_Scene");
    //fetch_nodes();
	fetch_nodes_in_group();
    reset_sub_tab()
    Final_message += check_drawings();
    Final_message += check_pegs()
    Final_message += check_composites()
    show_repport()
    build_available_fixes_and_types_list()
    inputDialog()

    scene.endUndoRedoAccum();

    MessageLog.trace("--------ENDLOG-");

    /*FUNCTIONS*/

    /*I N P U T   D I A L O G*/
    function inputDialog() {

        MessageLog.trace("inputDialog")

        var d = new Dialog
        d.title = "CHECK SCENE";
        d.width = 100;

        var all_nodes = 0;

        var inputL = new LineEdit;
        var line1 = new Label();
        var line2 = new Label();
        var line3 = new Label();
        var allBox = new CheckBox;

        if (available_types_list.length + available_fixes_list.length > 0) {

            var line1 = new Label();
            line1.text = "\nTypes of nodes to fix : \n";
            d.add(line1);

            for (var t = 0; t < available_types_list.length; t++) {
                var typeBox = new CheckBox
                typeBox.text = available_types_list[t] + " ( " + type_count[available_types_list[t]] + " nodes )";
                typeBox.nodetype = available_types_list[t];
                typeBox.checked = false;
                d.add(typeBox);
                typeBoxes.push(typeBox);

                all_nodes += type_count[available_types_list[t]];
            }

            var line2 = new Label();
            line2.text = "\nTypes of fixes to apply : \n";
            d.add(line2);

            for (var f = 0; f < available_fixes_list.length; f++) {
                var fixBox = new CheckBox
                fixBox.text = available_fixes_list[f] + " ( " + fix_count[available_fixes_list[f]] + " nodes )";
                fixBox.fixtype = available_fixes_list[f];
                fixBox.checked = true;

                d.add(fixBox);
                fixBoxes.push(fixBox);

            }

            var inputL = new LineEdit;
            inputL.label = "Exclude nodes with names containing : ";
            d.add(inputL);
            final_regex = "";
            inputL.text = "EXCLUDE";

 			var line4 = new Label();
            line4.text = "\n (more details on the detected issues are availes in the MessageLog)  \n";
            d.add(line4);

            var line3 = new Label();
            line3.text = "\n**************\n";
            d.add(line3);

            allBox.text = "FIX THEM ALL !" + " ( " + all_nodes + " nodes )";
            allBox.checked = false;
            d.add(allBox);



        } else {

			

            var line3 = new Label();
            line3.text = "\n CONGRATULATION, THE "+TARGET+" IS CLEAN ! (according to the script) \n";
            d.add(line3);


        }



        var rc = d.exec();
        if (rc) {

            if (allBox.checked != undefined && allBox.checked == true) {

                selected_types = available_types_list;
                selected_fixes = available_fixes_list;

            } else {

                for (var tb = 0; tb < typeBoxes.length; tb++) {

                    if (typeBoxes[tb].checked) {
                        selected_types.push(typeBoxes[tb].nodetype)
                    }

                }

                for (var fb = 0; fb < fixBoxes.length; fb++) {

                    if (fixBoxes[fb].checked) {
                        selected_fixes.push(fixBoxes[fb].fixtype)
                    }

                }
            }

            if (inputL.text != "" && inputL.text != null) {
               exclusionList = inputL.text.split(",");
               MessageLog.trace("exclusionList : "+exclusionList)

            }

            treat_nodes();

        }

    }

    function fetch_all_nodes() {

        MessageLog.trace("fetch_nodes")

        scene_drawings = node.getNodes([relevent_types[0]]);

        scene_composites = node.getNodes([relevent_types[1]]);

        scene_pegs = node.getNodes([relevent_types[2]]);

        scene_MC = node.getNodes([relevent_types[3]]);

    }
	
    function fetch_nodes_in_group() {

		MessageLog.trace("fetch_nodes_in_group");
		
		//Rassemble les nodes à traiter 
		var groups_to_analyse = [];
		
		var selected_nodes = selection.selectedNodes(0);
		
		//MessageLog.trace(selected_nodes)
		
		root_node = selected_nodes[0];
		
		var parent_group = 	node.parentNode(root_node) ;
		
		groups_to_analyse.push(parent_group);
		
		if( selection.numberOfNodesSelected()>0){ 
				
				var selected_nodes = selection.selectedNodes(0);

				//Première boucle parmis les nodes selectionnés
				for(var n = 0; n < selection.numberOfNodesSelected(); n++){ 

					var currentNode = selected_nodes[n];

					if(node.type(currentNode)=="GROUP"){
						
						groups_to_analyse.push(currentNode);

					} 

				}  

				var number_of_groups = groups_to_analyse.length;

				//deuxième boucle recursive à travers les groupes 
				for (var g = 0 ; g < number_of_groups ; g ++){
					
					currentGroup = groups_to_analyse[g];
					var subNodesInGroup= node.numberOfSubNodes(currentGroup);
					
					for (var sn = 0 ; sn < subNodesInGroup; sn++){

						var sub_node_name = node.subNode(currentGroup,sn);
						var sub_node = node.subNodeByName(currentGroup,sub_node_name);
						var sub_node_type = node.type(sub_node_name);

						var shortname = getShortName(sub_node_name)

						switch(sub_node_type){

							case relevent_types[0]:
							
								scene_drawings.push(sub_node_name)

							break;
							case relevent_types[1] :
							
								scene_composites.push(sub_node_name)

							break;
							case relevent_types[2] :
							
								scene_pegs.push(sub_node_name)

							break;
							case relevent_types[3]:
							
								scene_MC.push(sub_node_name)

							break;
						}

					}			
					
				}

			}else{  
				fetch_all_nodes();
				TARGET = "SCENE";
			} 	

    }

    function show_repport() {

        Final_message += "";
        MessageLog.trace(Final_message);

    }

    function check_drawings() {

        drawing_repport = "\n\n ****** D R A W I N G S \n\n";

        for (var i = 0; i < scene_drawings.length; i++) {

            currentNode = scene_drawings[i];
            var currentName = node.getName(currentNode)
            var problemes_list = [];


            if (node.getTextAttr(currentNode, cf, "canAnimate") == "Y") {

                problemes_list.push("Animate using animation tool is ON !");
                fix_list.push(new Fix("TURN OFF ANIMATE", currentNode));

            }

            if (node.getTextAttr(currentNode, cf, "useDrawingPivot") != "Don't Use Embedded Pivot") {

                problemes_list.push("Pivot Embedded on parent peg !");
                fix_list.push(new Fix("DONT USE PIVOT", currentNode));

            }


            if(keys_in_exposure(currentNode)==true){

  				 problemes_list.push("Keys in exposure !");
                fix_list.push(new Fix("REMOVE KEYS IN EXPOSURE", currentNode));

            }


            if (problemes_list.length > 0) {

                var current_repport = currentName + "\n"

                for (var p = 0; p < problemes_list.length; p++) {

                    current_repport += problemes_list[p] + "\n";

                }

                drawing_repport += "!-----> " + current_repport + "\n";
            }

        }

        return drawing_repport;

    }

    function select_and_tag_node(n){

		selection.addNodeToSelection(n);
        node.setTimelineTag(n, true)

    }

    function keys_in_exposure(drawing) {

    	 MessageLog.trace("-------look_for_keys_in_exposure-------");

    	var check = false;

        var drawingcolumn = getDrawingColumn(drawing)

        /*Checking every transform parameters*/
        var linkedColumnX = node.linkedColumn(drawing,"offset.x");
        var linkedColumnY = node.linkedColumn(drawing,"offset.y");
        var linkedColumnZ = node.linkedColumn(drawing,"offset.z");
        var linkedColumnSX = node.linkedColumn(drawing,"scale.x");
        var linkedColumnSY = node.linkedColumn(drawing,"scale.y");
        var linkedColumnAZ = node.linkedColumn(drawing,"rotation.anglez");
        var linkedColumnSK = node.linkedColumn(drawing,"skew");

        if(linkedColumnX!= ""){
        	check = true;
        }
        if (linkedColumnY!= ""){
        	check = true;

		}
        if (linkedColumnZ!= ""){
        	check = true
		}
        if(linkedColumnSX!= ""){
        	check = true;
        }
        if (linkedColumnSY!= ""){
        	check = true;

		}
        if (linkedColumnAZ!= ""){
        	check = true
		}
        if (linkedColumnSK!= ""){
        	check = true
		}

        MessageLog.trace(node.linkedColumn(drawing,"offset"))
        MessageLog.trace(node.linkedColumn(drawing,"offset.x"))
        MessageLog.trace(node.linkedColumn(drawing,"offset.y"))

        return check;

    }

    function clear_keys_in_exposure(drawing,cf) {

    	MessageLog.trace("-------clear_keys_in_exposure-------");

    	//node.setTextAttr(drawing, "canAnimate", cf, "Y");
    	//node.setTextAttr(this.node_to_fix, "useDrawingPivot", cf, "Apply Embedded Pivot on Drawing Layer");

      	var linkedColumnX = node.linkedColumn(drawing,"offset.x");
        var linkedColumnY = node.linkedColumn(drawing,"offset.y");
        var linkedColumnZ = node.linkedColumn(drawing,"offset.z");
        var linkedColumnSX = node.linkedColumn(drawing,"scale.x");
        var linkedColumnSY = node.linkedColumn(drawing,"scale.y");
        var linkedColumnAZ = node.linkedColumn(drawing,"rotation.anglez");
        var linkedColumnSK = node.linkedColumn(drawing,"skew");


       

		if(linkedColumnX!= ""&& column.isKeyFrame(linkedColumnX,0,cf)){
			column.clearKeyFrame(linkedColumnX, f)
		}
		if(linkedColumnY!= "" && column.isKeyFrame(linkedColumnY,0,cf)){
			column.clearKeyFrame(linkedColumnY, f)
		}
		if(linkedColumnZ!= "" && column.isKeyFrame(linkedColumnZ,0,cf)){
			column.clearKeyFrame(linkedColumnZ, f)
		}
		if(linkedColumnSX!= ""&& column.isKeyFrame(linkedColumnSX,0,cf)){
			column.clearKeyFrame(linkedColumnSX, f)
		}
		if(linkedColumnSY!= "" && column.isKeyFrame(linkedColumnSY,0,cf)){
			column.clearKeyFrame(linkedColumnSY, f)
		}
		if(linkedColumnAZ!= "" && column.isKeyFrame(linkedColumnAZ,0,cf)){
			column.clearKeyFrame(linkedColumnAZ, f)
		}
		if(linkedColumnSK!= "" && column.isKeyFrame(linkedColumnSK,0,cf)){
			column.clearKeyFrame(linkedColumnAZ, f)
		}


        if(linkedColumnX!= ""){
        	node.unlinkAttr(drawing, "offset.x");
        	column.removeUnlinkedFunctionColumn	(linkedColumnX)	
        }
        if(linkedColumnY!= ""){
        	node.unlinkAttr(drawing, "offset.y");
        	column.removeUnlinkedFunctionColumn	(linkedColumnY)	
        }
        if(linkedColumnZ!= ""){
        	node.unlinkAttr(drawing, "offset.z");
        	column.removeUnlinkedFunctionColumn	(linkedColumnZ)	
        }
        if(linkedColumnSX!= ""){
        	node.unlinkAttr(drawing, "scale.x");
        	column.removeUnlinkedFunctionColumn	(linkedColumnSX)	
        }
        if(linkedColumnSY!= ""){
        	node.unlinkAttr(drawing,"scale.y");
        	column.removeUnlinkedFunctionColumn	(linkedColumnSY)	
        }
        if(linkedColumnAZ!= ""){
        	node.unlinkAttr(drawing, "rotation.anglez");
        	column.removeUnlinkedFunctionColumn	(linkedColumnAZ)	
        }
        if(linkedColumnSK!= ""){
        	node.unlinkAttr(drawing, "skew");
        	column.removeUnlinkedFunctionColumn	(linkedColumnSK)	
        }
    }

    function getDrawingColumn(drawing) {

        for (var i = 0; i < Timeline.numLayers; i++) {

            if (Timeline.layerIsColumn(i)) {

                var currentColumn = Timeline.layerToColumn(i);

                if (column.type(currentColumn) == "DRAWING") {

                    var drawing_node = Timeline.layerToNode(i);

                    if (drawing_node == drawing) {

                        return currentColumn;
                    }
                }
            }
        }
    }

    function check_composites() {

        composites_repport = "\n\n ****** C O M P O S I T E S \n\n";

        for (var i = 0; i < scene_composites.length; i++) {

            currentNode = scene_composites[i];
            var problemes_list = [];
            var currentName = node.getName(currentNode)

            if (node.getTextAttr(currentNode, cf, "compositeMode") != "Pass Through") {

                problemes_list.push("not in passthrougth");
                fix_list.push(new Fix("COMPOSITE IN PASS THROUGH", currentNode));


            }


            if (problemes_list.length > 0) {

                var current_repport = currentName + "\n"

                for (var p = 0; p < problemes_list.length; p++) {

                    current_repport += problemes_list[p] + "\n";

                }

                selection.addNodeToSelection(currentNode);
                node.setTimelineTag(currentNode, true)
                composites_repport += "!-----> " + current_repport + "\n";

                //MessageBox.information("!-----> "+current_repport+"\n")
            }

        }

        return composites_repport

    }

    /* P E G */
	
	
	function get_separate(n){
		
			var s_attr = "POSITION.SEPARATE";
			var result = node.getTextAttr(n,frame.current(),"POSITION.SEPARATE");
			
			if(result != null){
				return result; 
			}
			
			return false;
			
	}
	
	function set_separate_on(n){
		
		var s_attr = "POSITION.SEPARATE";
		node.setTextAttr(n,"POSITION.SEPARATE",frame.current(),"On");
		
	}

	function getAttributesNameList (snode){
		
		//MessageLog.trace(arguments.callee.name)
		
		var attrList = node.getAttrList(snode, frame.current(),"");
		var name_list= Array();
		
		for (var i=0; i<attrList.length; i++){	

			var attr = attrList[i];
			var a_name = attr.keyword();
			var sub_attr = attr.getSubAttributes()
			name_list.push(a_name);

			if(sub_attr.length > 0){
				for (var j=0; j<sub_attr.length; j++){	
					attrList.push(sub_attr[j]);
					var sub_attr_name = sub_attr[j].fullKeyword()
					name_list.push(sub_attr_name);
				}
			}
			
		}
		
		
		return name_list;
		
	}

    function check_pegs() {

        var pegs_repport = "\n\n ****** P E G S \n\n"

        for (var i = 0; i < scene_pegs.length; i++) {

            var problemes_list = [];
            var currentNode = scene_pegs[i]
            var currentName = node.getName(currentNode);
            var keys = get_Keys(currentNode);
            var rest = get_Rest(currentNode)
			var separate = get_separate(currentNode);
			
			MessageLog.trace("separate : ");
			MessageLog.trace(separate);
			
            if (rest.z > 2 && keys.z != 0) {

                problemes_list.push("Z value is too high : " + rest.z)

                fix_list.push(new Fix("CHANGE Z TO 0", currentNode));
            }
			
            if (rest.scalex != 1 && keys.scalex != 1) {

                problemes_list.push("SCALE X value not egal to 1 : " + rest.scalex)

                fix_list.push(new Fix("CHANGE SCALE X TO 1", currentNode));
            }
			
            if (rest.scaley != 1&& keys.scaley != 1) {

                problemes_list.push("SCALE Y value not egal to 1: " + rest.scaley)

                fix_list.push(new Fix("CHANGE SCALE Y TO 1", currentNode));

            }
			
            if (rest.skew != 0&& keys.skew != 0) {

                problemes_list.push("SKEW values : " + rest.skew)

                fix_list.push(new Fix("CHANGE SKEW TO 0", currentNode));

            }

            if (separate == "Off") {

                problemes_list.push("SEPARATE OFF")

                fix_list.push(new Fix("TURN SEPARATE ON", currentNode));

            }
		
            if (problemes_list.length > 0) {

                var current_repport = node.getName(currentNode) + "\n"

                for (var p = 0; p < problemes_list.length; p++) {

                    current_repport += problemes_list[p] + "\n";

                }

                selection.addNodeToSelection(currentNode);
                node.setTimelineTag(currentNode, true)
                pegs_repport += "!-----> " + current_repport + "\n" + "\n";

                //MessageBox.information("!-----> "+current_repport+"\n")
            }
			
        }

        return pegs_repport;

    }

    function get_Rest(peg) {

        var Z = 0
        var rest = {
            z: 0,
            scalex: 0,
            scaley: 0,
            skew: 0
        }
        rest.z = node.getTextAttr(peg, cf, "position.z");
        rest.scalex = node.getTextAttr(peg, cf, "scale.x");
        rest.scaley = node.getTextAttr(peg, cf, "scale.y");
        rest.skew = node.getTextAttr(peg, cf, "SKEW");

        return rest;
    }
	
	function get_linked_columns(_node){
		
		var attr_colmun_list = Array();
	
		var attrList = getAttributesNameList (_node);
		
		for (var i=0; i<attrList.length; i++){
			
			var attribute_name = attrList[i]

			var linked_column = node.linkedColumn(_node,attribute_name)
			
			if( linked_column !=""){
				
				var att_col = {attr:attribute_name,col:linked_column};
				
				attr_colmun_list.push(att_col);
			
			}
			
		}
		
		return attr_colmun_list;
		
		
	}

    function get_Keys(peg) {

        var sceneFrames = frame.numberOf();
        var number_of_columns = column.numberOf()
        var repport = "";
		//those should sty at 0 or 1
        var keys = {
            z: 0,
            scalex: 1,
            scaley: 1,
            skew: 0
        }

        var Z_key_values = []
        var Scale_x_key_values = []
        var Scale_y_key_values = []
        var Skew_key_values = []
		
		var linked_column = get_linked_columns(peg);
		
		 for (var f = 0; f < sceneFrames + 1; f++) {
		
			for (var c = 0; c < linked_column.length; c++) {
				
				var atcol = linked_column[c];
				
				var cur_attribute = atcol.attr;
				var cur_colmun = atcol.col;
				
				switch (atcol.attr){
					
					case("SCALE.X"):
						keys.scalex*=column.getEntry(cur_colmun, 1, f)
					break;
					case("SCALE.Y"):
						keys.scaley*=column.getEntry(cur_colmun, 1, f)
					break;			
					case("SCALE.XY"):
					
					break;					
					case("SKEW"):
						keys.skew+=column.getEntry(cur_colmun, 1, f)
					break;		
					case("POSITION.Z"):
						keys.z*=column.getEntry(cur_colmun, 1, f)
					break;					
				}
				
			}
		
		 }

        return keys;
		
    }


    /*************************************/


    function treat_nodes() {

        var repport = ""

        MessageLog.trace("treat_nodes")
        MessageLog.trace(fix_list.length)
        MessageLog.trace("selected fixes :"+selected_fixes)
        MessageLog.trace("selected types :"+selected_types)

        for (var i = 0; i < fix_list.length; i++) {

            current_fix = fix_list[i];

            node_type = node.type(current_fix.node_to_fix)
			
			 /*Clear keyframes*/
			for (var f = 0; f < frame.numberOf() + 1; f++) {

				if (!check_name_pattern(current_fix.node_to_fix)) {

					if (includes(selected_types,node_type) && includes(selected_fixes, current_fix.fixtype)) {

						MessageLog.trace("fix "+i+"----"+current_fix)
						current_fix.apply(f);

						select_and_tag_node(current_fix.node_to_fix)

					}

				}
			
			}


        }


    }

    function build_available_fixes_and_types_list() {


        var stored_nodes = []

        MessageLog.trace("build_available_fixes_and_types_list")

        for (var i = 0; i < fix_list.length; i++) {

            current_fix = fix_list[i];
            node_type = node.type(current_fix.node_to_fix)

            if (!includes(available_fixes_list, current_fix.fixtype)) {

                available_fixes_list.push(current_fix.fixtype)
            }

            if (!includes(available_types_list, node_type)) {

                available_types_list.push(node_type)
            }

            /*COMPTE DES FIXES ET TYPES*/

            if (!includes(stored_nodes, current_fix.node_to_fix)) {

                if (node_type in type_count) {

                    type_count[node_type] += 1
                } else {

                    type_count[node_type] = 1;
                }

                stored_nodes.push(current_fix.node_to_fix)

            } else {


            }



            if (current_fix.fixtype in fix_count) {

                fix_count[current_fix.fixtype] += 1
            } else {

                fix_count[current_fix.fixtype] = 1;
            }


        }


    }


    /* CLASS FIX */
    function Fix(fixtype, node_to_fix) {

        this.fixtype = fixtype;
        this.node_to_fix = node_to_fix

        this.apply = function(cf) {

            MessageLog.trace("APPLY FIX")

            var repport = this.fixtype + "  ";
			
			var linked_column  ="";

            switch (this.fixtype) {
                case "TURN OFF ANIMATE":
                    node.setTextAttr(this.node_to_fix, "canAnimate", cf, "N");
                    break;
                case "DONT USE PIVOT":
                    node.setTextAttr(this.node_to_fix, "useDrawingPivot", cf, "Don't Use Embedded Pivot");
                    break;
                case "REMOVE KEYS IN EXPOSURE":
                     clear_keys_in_exposure(this.node_to_fix)
                    break;
                case "CHANGE SCALE X TO 1":
                    node.setTextAttr(this.node_to_fix, "SCALE.X", cf, 1);
                    node.setTextAttr(this.node_to_fix, "SCALE.XY",cf, 1);
					this.apply_to_column("SCALE.X",cf,1);
					
                    break;
                case "CHANGE SKEW X TO 0":
                    node.setTextAttr(this.node_to_fix, "SKEW", cf, 1);
                    break;
                case "CHANGE SCALE Y TO 1":
                    node.setTextAttr(this.node_to_fix, "SCALE", cf, 1);
                    node.setTextAttr(this.node_to_fix, "SCALE.Y", cf, 1);
                    node.setTextAttr(this.node_to_fix, "SCALE.XY", cf, 1);
					this.apply_to_column("SCALE.Y",cf,1);
					
                    break;
                case "CHANGE SKEW TO 0":
				
                    node.setTextAttr(this.node_to_fix, "SKEW", cf, 0);
					this.apply_to_column("SKEW",cf,0);
					
                    break;
                case "CHANGE Z TO 0":
                    node.setTextAttr(this.node_to_fix, "POSITION.Z", cf, 0);
					this.apply_to_column("POSITION.Z",cf,0);
                    break;
                case "COMPOSITE IN PASS THROUGH":
                    node.setTextAttr(this.node_to_fix, "compositeMode", cf, "Pass Through");
                    break;
				case "TURN SEPARATE ON":
					set_separate_on(this.node_to_fix);
					break;
                default:
                    MessageLog.trace("unknown fix type")
            }

            MessageLog.trace("___" + this.node_to_fix + "----- FIXED ------>" + repport)
			
            return repport


        }
		
		this.apply_to_column = function(_attribute,cf,value){
			
			var  linked_column = node.linkedColumn(this.node_to_fix,_attribute)
			if(column.isKeyFrame(linked_column,0,cf)){
				column.setEntry(linked_column,0,cf,value);
			}
			
		}



    }


    function includes(array, item) {

        for (var i = 0; i < array.length; i++) {
            if (array[i] == item) {
                return true;
            }
        }
        return false;

    }

    function reset_sub_tab() {

        substituions_tab = {
            columns: [],
            drawings: [],
            substitions: []
        };

    }

    function get_Attr_Keyframes(n, attr) {

        var sceneFrames = frame.numberOf();
        var numLayers = Timeline.numLayers;

        var rapport = "";

        keyframes_tabs = {
            columns: [],
            nodes: [],
            keyframes: []
        };


        for (var i = 0; i < Timeline.numLayers; i++) {


            if (Timeline.layerIsNode(i) && Timeline.layerToNode(i) == d) {

                var currentColumn = Timeline.layerToColumn(i);

                var node = Timeline.layerToNode(i);

                if (column.type(currentColumn) == "DRAWING") {

                    var substitution_timing = column.getDrawingTimings(currentColumn);

                    var unexposed_subs = substitution_timing;

                    //on fait la liste des subs non exposées 

                    for (var f = 0; f < sceneFrames; f++) {

                        var current_substitution = column.getEntry(currentColumn, 1, f);

                        if (current_substitution != "") {

                            var indexToRemove = unexposed_subs.indexOf(current_substitution);

                            if (indexToRemove > -1) {

                                unexposed_subs.splice(indexToRemove, 1);

                            }

                        }

                    }

                    if (unexposed_subs.length > 0) {

                        rapport = "Unexposed_subs";

                        substituions_tab.columns.push(currentColumn);

                        substituions_tab.drawings.push(node);

                        substituions_tab.substitions.push(unexposed_subs);

                    }

                }

            }

        }

        for (var c = 0; c < substituions_tab.columns.length; c++) {

            var currentColumn = substituions_tab.columns[c];
            var drawing = substituions_tab.drawings[c];

            rapport = "Unexposed substitutions :"

            for (var u = 0; u < substituions_tab.substitions[c].length; u++) {

                var sub_to_delete = substituions_tab.substitions[c][u];
                rapport += sub_to_delete;

                if (u < substituions_tab.substitions[c].length - 1) {
                    rapport += " , ";
                }

            }


        }

        return rapport;

    }


    function print_node_attribiutes(n) {

        var myList = node.getAttrList(n, 1);

        for (i = 0; i < 100; i++) {
            if (typeof myList[i] === 'object' && myList[i] !== null) {
                MessageLog.trace(myList[i].keyword());
            }
        }

        return

    }

    function check_name_pattern(str) {

    	MessageLog.trace("check_name_pattern")

		for (var e = 0; e < exclusionList.length; e++) {

			MessageLog.trace(str+" check for "+exclusionList[e])
			var regex = new RegExp(exclusionList[e]);
			var result = str.match(regex);
						MessageLog.trace("regex "+regex)
			MessageLog.trace("result "+result)


			if (result!=""&&result!=null&&result!=0) {
			  MessageLog.trace('string found');
			  return true;
			}
        }

        MessageLog.trace('no match');

        return false;
    }


    function getShortName(n) {

        //Extrait le nom du node sans la hierarchie
        split_string = n.split("/")
        return split_string[split_string.length - 1];

    }


}
