F:
cd F:\RenderStreaming\Test60_Multiple_Process_01\Build\

start Test60_Multiple_Process_01 websocket-port=%1

cd F:\RenderStreaming\UnityRenderStreaming_Mutilple_Process\WebApp\

node ./build/index.js -p %1

