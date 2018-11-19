
function loadGraph(states, edges) {

// Create a new directed graph
    var g = new dagreD3.graphlib.Graph().setGraph({});

// Add states to the graph, set labels, and style
    Object.keys(states).forEach(function (state) {
        var value = states[state];
        value.rx = value.ry = 5;
        g.setNode(state, value);
    });

// Set up the edges
    edges.forEach(function(edge)
    {
        g.setEdge(edge["from"], edge["to"], edge['value']);
    });

// Create the renderer
    var render = new dagreD3.render();

// Set up an SVG group so that we can translate the final graph.
    var svg = d3.select("svg");
    var inner = svg.append("g");

// Set up zoom support
    var zoom = d3.zoom()
        .on("zoom", function () {
            inner.attr("transform", d3.event.transform);
        });
    svg.call(zoom);

// Simple function to style the tooltip for the given node.
    var styleTooltip = function (name, description) {
        return "<p class='name'>" + name + "</p><p class='description'>" + description + "</p>";
    };

// Run the renderer. This is what draws the final graph.
    render(inner, g);

    inner.selectAll("g.node")
        .attr("title", function (v) {
            return styleTooltip(v, g.node(v).description)
        })
        .each(function (v) {
            $(this).tipsy({gravity: "w", opacity: 1, html: true});
        });

// Center the graph
    var initialScale = 0.75;
    svg.call(zoom.transform, d3.zoomIdentity.translate((svg.attr("width") - g.graph().width * initialScale) / 2, 20).scale(initialScale));
    svg.attr('height', g.graph().height * initialScale + 40);
}


$(function() {
    let xml = '<workflow-app xmlns="uri:oozie:workflow:0.4" name="simple-Workflow">\n' +
        '    <start to="Create_External_Table" />\n' +
        '    <action name="Create_External_Table">\n' +
        '        <hive xmlns="uri:oozie:hive-action:0.4">\n' +
        '            <job-tracker>xyz.com:8088</job-tracker>\n' +
        '            <name-node>hdfs://rootname</name-node>\n' +
        '            <script>hdfs_path_of_script/external.hive</script>\n' +
        '        </hive>\n' +
        '        <ok to="Create_orc_Table" />\n' +
        '        <error to="kill_job" />\n' +
        '    </action>\n' +
        '    <action name="Create_orc_Table">\n' +
        '        <hive xmlns="uri:oozie:hive-action:0.4">\n' +
        '            <job-tracker>xyz.com:8088</job-tracker>\n' +
        '            <name-node>hdfs://rootname</name-node>\n' +
        '            <script>hdfs_path_of_script/orc.hive</script>\n' +
        '        </hive>\n' +
        '        <ok to="Insert_into_Table" />\n' +
        '        <error to="kill_job" />\n' +
        '    </action>\n' +
        '    <action name="Insert_into_Table">\n' +
        '        <hive xmlns="uri:oozie:hive-action:0.4">\n' +
        '            <job-tracker>xyz.com:8088</job-tracker>\n' +
        '            <name-node>hdfs://rootname</name-node>\n' +
        '            <script>hdfs_path_of_script/Copydata.hive</script>\n' +
        '            <param>database_name</param>\n' +
        '        </hive>\n' +
        '        <ok to="end" />\n' +
        '        <error to="kill_job" />\n' +
        '    </action>\n' +
        '    <kill name="kill_job">\n' +
        '        <message>Job failed</message>\n' +
        '    </kill>\n' +
        '    <end name="end" />\n' +
        '</workflow-app>';

    let $wfarea = $('textarea');
    $wfarea.val(xml);
    function getGraphFromXml(str) {
        let $wfarea = $('textarea');
        let xml = $($wfarea.val());
        var states = {};
        var edges = [];
        states['Start'] = {'description': $(this).text(), labelStyle: "font-size: 2em"};
        edges.push({'from': "Start", 'to': xml.find('start').attr('to'),value : {'label': 'starting work'}});

        xml.find("action").each(function () {
            // <action name="hive2-a1aa" cred="hive2">
            states[$(this).attr('name')] = {'description': $(this).text()};
            edges.push({'from': $(this).attr("name"), 'to': $(this).find('ok').attr('to'), value : {
                //'label': 'ok'
                    'arrowheadStyle' : "fill: #afa"

                }})
            edges.push({'from': $(this).attr("name"), 'to': $(this).find('error').attr('to'), value :{
                    //'label': 'error',
                'style' : "stroke: #f77;",
                'arrowheadStyle' : "fill: #f77"
                            }})
        });

        // Decision:

        xml.find('decision').each(function () {
            states[$(this).attr('name')] = {'description': $(this).children().text(), shape: "diamond", style: "fill: #afa"};
            let $th = $(this);
            let $name = $(this).attr("name");
            edges.push({'from' : $name, 'to' : $th.find('default').attr('to'), value :  {'label' : "default"}});
            xml.find('case').each(function(){
                edges.push({'from' : $name, 'to' : $(this).attr('to'),value :  {'label' : $(this).text()}})
            });
        })


        // Fork:
        xml.find('fork').each(function() {
            states[$(this).attr('name')] = {'description': $(this).children().text()};
            let $th = $(this);
            let $name = $(this).attr("name");
            xml.find('path').each(function(){
                edges.push({'from': $name, 'to': $(this).attr('start'),value :  {'label': 'fork'}})
            });
        });

        //Join:
        xml.find('join').each(function() {
            states[$(this).attr('name')] = {'description': $(this).children().text()};
            edges.push({'from': $(this).attr("name"), 'to': $(this).attr('to'),value :  {'label': 'Joined'}})
        });


        states[xml.find("end").attr("name")] = {'description' : 'End of the workflow', labelStyle: "font-size: 2em"};
        states[xml.find("kill").attr("name")] = {'description' : xml.find("kill").children().text(), labelStyle: "fill: #fff", style: "fill: #c41a16"};
        return {'states' : states, 'edges' : edges};
    }
    $('#loadbtn').on('click',function(){
        var ret = getGraphFromXml($('textarea').val());
        $('#svg').find('g').remove();
        loadGraph(ret['states'], ret['edges']);
    });
    var ret = getGraphFromXml($('textarea').val());
    loadGraph(ret['states'], ret['edges']);

});
