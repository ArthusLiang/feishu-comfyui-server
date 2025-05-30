
import { myfetch, generateGUID } from './tools';

export interface IComfyImage {
    name:string;
    subfolder:string;
    type: string;
}

export interface IPromptEvents {
    callback?:any;
    onprogress?:any;
}

export class ComfyServer {

    ws:WebSocket|undefined;
    tasks: Record<string, IPromptEvents>={};
    promptIDFromProgress: string = '';
    server: string ='';
    clientId: string = '';

    constructor(server:string) {
        this.changeConfig(server);
    }

    changeConfig(server:string) {
        this.server = server;
    }

    connectWS(outputId:string, callWhenOpen?:any) {
        if(this.ws === undefined) {
            this.clientId =generateGUID();
            this.ws = new WebSocket(`wss://${this.server}/ws?clientId=${this.clientId}`);
            this.ws.addEventListener('open', ()=>{
                if(callWhenOpen) {
                    callWhenOpen();
                }
            });
            //this.ws.addEventListener('open', ()=>{});
            this.ws.addEventListener('message', (msg)=>{
                let obj = JSON.parse(msg.data);
                let data = obj.data;
                switch(obj.type) {
                    case 'progress':
                        if(data && typeof data.value === 'number'
                            && data.value == data.max && data.prompt_id
                        ) {
                            this.promptIDFromProgress = data.prompt_id;
                        }
                        break;  
                    case 'status':
                        if(this.promptIDFromProgress!=='' && this.promptIDFromProgress!= undefined) {
                            this.checkPrompt(this.promptIDFromProgress, outputId);
                            this.promptIDFromProgress = '';
                        }
                        break;   
                    case 'executing':
                        break;
                    case 'executed':
                        break;     
                }
            });
        } else {
            if(callWhenOpen) {
                callWhenOpen();
            }
        }
    }

    generate(workflow:string, prompt:string, promptNodeId:string, outputId:string , events?:IPromptEvents) {
        let w = JSON.parse(workflow);
        if (Object.prototype.hasOwnProperty.call(w[promptNodeId].inputs, 'value')) {
            w[promptNodeId].inputs.value = prompt;
        } else {
            w[promptNodeId].inputs.text = prompt;
        }
        return this.connectWS(outputId, ()=>{
            this.prompt({
                clientId: this.clientId,
                prompt: w
            }).then((res)=>{
                this.tasks[res.prompt_id]= events || {};
                this.checkPrompt(res.prompt_id, outputId);
            });
        });
    }

    checkPrompt(promptID:string, outputId:string) {
        if(this.tasks[promptID]) {
            let events = this.tasks[promptID];
            if(promptID && events) {
                this.history(promptID).then((data)=>{
                    if(data && data[promptID]) {
                        const outputs = data[promptID].outputs;
                        let resultImages:any = [];
                        if(outputId==='') {
                            Object.values(outputs).forEach((v:any)=>{
                                if(Array.isArray(v.images) && v.images.length>0) {
                                    resultImages = resultImages.concat(v.images);
                                }
                            });
                        } else {
                            let v = outputs[outputId];
                            if(Array.isArray(v.images) && v.images.length>0) {
                                resultImages = resultImages.concat(v.images);
                            }
                        }
                        let imgurls = this.getImagesUrl(resultImages);
                        if(events.callback) {
                            events.callback(imgurls);
                        }
                        delete this.tasks[promptID];
                        if(Object.keys(this.tasks).length === 0) {
                            this.destory();
                        }
                    }
                })
            }
        }
    }

    prompt(args:any) {
        return myfetch(`https://${this.server}/prompt`, '', 'POST', args,  {
            'Content-Type': 'application/json; charset=utf-8',
            'Connection':'Keep-Alive'
        });
    }

    history(promptId:string) {
        return myfetch(`https://${this.server}/history/${promptId}`, '', 'GET', {}, {
            'Content-Type': 'application/json; charset=utf-8',
            'Connection':'Keep-Alive'
        });
    }

    //BOLB[] or use the imageURL
    getImage(arg:IComfyImage) {
        return myfetch(`https://${this.server}/view`, '', 'GET', arg);
    }

    //BOLB[]
    getImages(args:IComfyImage[]) {
        return new Promise((resolve,reject)=>{
            let ret:any = [];
            let todo = args.length;
            let callback = (res?:any)=>{
                todo--;
                ret.push(res);
                if(todo<=0) {
                    resolve(ret);
                }
            };
            args.forEach((arg)=>{
                this.getImage(arg).then((res)=>{
                    callback(res);
                }).catch((e)=>{
                    callback();
                });
            });
        });
    }

    getImagesUrl(args:IComfyImage[]) { 
        return args.map((arg)=>{
            let params = arg ? Object.entries(arg).map(([key, value])=>{
                return `${key}=${value}`;
            }).join('&') : undefined;
            return `https://${this.server}/view?${params}`;
        })
    }
    
    destory() {
        if(this.ws) {
            this.ws.close();
            delete this.ws;
        }
    }

}