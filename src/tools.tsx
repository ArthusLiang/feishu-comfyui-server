export function generateGUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        let r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
const handleRes = function(response:Response) {
    const contentType = response.headers.get('Content-Type') || '';
    // 根据Content-Type选择解析方法
    if (contentType.includes('application/json')) {
        return response.json();
    } else if (contentType.includes('text')) {
        return response.text();
    } else if (
        contentType.includes('image') ||
        contentType.includes('application/octet-stream')
    ) {
        return response.blob();
    } else {
        // 默认解析为文本
        return response.text();
    }
}
//settings __FULL
const myGet = function(url:string, authorization:string, args?:Record<string, any>, settings?:Record<string, any>):Promise<any> {
    let params = args ? Object.entries(args).map(([key, value])=>{
        return `${key}=${value}`;
    }).join('&') : undefined;
    let _url = params ? `${url}?${params}` : url;
    const headers = Object.assign({
        method: 'GET',
        headers: {
            'Content-Type': 'application/json', // 设置Content-Type为JSON
        }
    },settings);
    if(authorization && authorization!='') {
        (headers.headers as any).Authorization = authorization
    }
    return fetch(_url, headers).then((response)=>{
        if (response.ok) {
            if(settings && settings.__FULL) {
                return handleRes(response).then((body)=>{
                    return {
                        headers: response.headers,
                        body: body
                    }
                });
            } else {
                return handleRes(response);
            }
        } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    }).catch((e)=>{
        return Promise.reject(e);
    });
};

const myPost = function(url:string, authorization:string, args?:Record<string, any>, settings?:Record<string, any>):Promise<any> {
    const headers = Object.assign({
        method: 'POST',
        headers: {
            'Content-Type': 'application/json', // 设置Content-Type为JSON
        },  
        body: JSON.stringify(args || {})
    },settings);
    if(authorization && authorization!='') {
        (headers.headers as any).Authorization = authorization
    }
    return fetch(url,headers).then((response)=>{
        if (response.ok) {
            return handleRes(response);
        } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    }).catch((e)=>{
        return Promise.reject(e);
    });
};

const myForm = function(url:string, authorization:string, args?:Record<string, any>, settings?:Record<string, any>):Promise<any> {
    const formData = new FormData();
    if(args) {
        Object.entries(args).forEach(([key, value])=>{
            formData.append(key, value);
        });
    }
    const headers = Object.assign({
        method: 'POST',
        headers: {},  
        body: formData
    },settings);
    if(authorization && authorization!='') {
        (headers.headers as any).Authorization = authorization
    }
    return fetch(url, headers).then((response)=>{
        if (response.ok) {
            return handleRes(response);
        } else {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
    }).catch((e)=>{
        return Promise.reject(e);
    });
};

export const myfetch = function(url:string, authorization:string="", method:string='GET', args?:Record<string, any>, settings?:Record<string, any>):Promise<any> {
    switch(method) {
        case 'POST':
            return myPost(url, authorization, args, settings);
        case 'FORM':
            return myForm(url, authorization, args, settings);
        default:
            return myGet(url, authorization, args, settings);
    }
}

/**
 * 将JSON数据存储到localStorage
 * @param key 存储的键
 * @param data 要存储的JSON数据
 */
export function saveJsonToLocalStorage(key: string, data: any): void {
  try {
    const jsonString = JSON.stringify(data);
    localStorage.setItem(key, jsonString);
  } catch (error) {
    console.error("Error saving data to localStorage:", error);
  }
}

/**
 * 从localStorage读取数据并转换成JSON对象
 * @param key 读取的键
 * @returns 转换后的JSON对象，如果不存在或解析失败则返回null
 */
export function getJsonFromLocalStorage<T>(key: string): T | null {
  try {
    const jsonString = localStorage.getItem(key);
    if (jsonString === null) {
      return null;
    }
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Error getting data from localStorage:", error);
    return null;
  }
}