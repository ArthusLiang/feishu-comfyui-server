import './App.css';
import { bitable, FieldType } from "@lark-base-open/js-sdk";
import { Button, Input, TextArea, Tabs, TabPane,RadioGroup, Radio, Spin, Steps} from '@douyinfe/semi-ui';
import { IconSetting, IconGlobe,  IconLoading, IconHelpCircle} from '@douyinfe/semi-icons';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ISettings } from './types';
import { getJsonFromLocalStorage, saveJsonToLocalStorage} from './tools';
import { ComfyServer } from './server';

const KEY_SETTINGS = 'KEY_SETTINGS';

export default function App() {
	const { t } = useTranslation();
	const [promptText, setPromptText] = useState('');
	const [generatedImages, setGeneratedImages] = useState<string[]>([]);
	const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

	const [isLoadingGenerate, setIsLoadingGenerate] = useState(false);
	const [isLoadingUpload, setIsLoadingUpload] = useState(false);

	//init
	const settings = useRef<ISettings>({
		server: '',
		workflow: '',
		promptNode: '0',
		outputNode: '1',
		field_to_save: 'generated images',
		current_fieldId: '',
		current_recordId: '',
		selectedIndex: 0,
	});

	const Comfy = useRef<ComfyServer>(new ComfyServer(settings.current.server));

	let _storedValue = getJsonFromLocalStorage(KEY_SETTINGS);
	if(_storedValue) {
		settings.current = _storedValue as ISettings;
	}
	const saveSettings = () => {
		saveJsonToLocalStorage(KEY_SETTINGS, settings.current);
	};

	const handleSettingsChange = (key:string, value: string | any)=> {
		settings.current[key] = value;
	};

	const checkField = ()=>{
		return bitable.base.getActiveTable().then((table)=>{
			return table.getFieldByName(settings.current.field_to_save).then((data)=>{
				return data.id;
			}).catch((e)=>{
				return table.addField({
					type: FieldType.Attachment,
					name: settings.current.field_to_save
				}).then((id)=>{
					return id;
				});
			});
		});
	};

	const initTable = ()=> {
		bitable.base.onSelectionChange((e)=>{
			if(e.data.fieldId && e.data.recordId) {
				bitable.base.getActiveTable().then((table)=>{
					table.getCellValue(e.data.fieldId!, e.data.recordId!).then((ceil)=>{
						if(Array.isArray(ceil) && ceil.length>0 && (ceil[0] as any).type=='text') {
							setPromptText((ceil[0] as any).text);
							handleSettingsChange('current_fieldId',e.data.fieldId);
							handleSettingsChange('current_recordId',e.data.recordId);
							saveSettings();
						}
					});
				});
			}
		});
	};

	const generate = ()=> {
		setIsLoadingGenerate(true); // Set loading to true
		setGeneratedImages([]);
		const _settings = settings.current;
		const _comfy = Comfy.current;
		if(!_settings.workflow) {
			setIsLoadingGenerate(false); // Reset loading if workflow is empty
			return ;
		}
		_comfy.changeConfig(_settings.server);
		_comfy.generate(
			_settings.workflow,
			promptText,
			_settings.promptNode,
			_settings.outputNode,
			{
			callback: (urls:any)=>{
				if(Array.isArray(urls)) {
					setGeneratedImages(urls as any);
				}
				setIsLoadingGenerate(false); // Reset loading after generation
			}
		});
	};

	const fileFromImageURL = async (imageUrl: string, current_recordId: string, selectedImageIndex: number) => {
		const response = await fetch(imageUrl);
		const blob = await response.blob();
		const contentType = blob.type || 'image/jpeg'; // 自动获取 MIME 类型或默认 JPEG
		const extension = contentType.split('/').pop() || 'jpg'; // 从 MIME 类型中提取后缀名
		const fileName = `${current_recordId}_${selectedImageIndex}.${extension}`;
		const file = new File([blob], fileName, { type: contentType });
		return file;
	};

	const upload = async ()=> {
		setIsLoadingUpload(true); // Set loading to true
		const url = generatedImages[selectedImageIndex];
		if (!url) {
			setIsLoadingUpload(false); // Reset loading if no URL
			return;
		}
		try {
			const fieldId = await checkField();
			if (fieldId && settings.current.current_recordId) {
				const table = await bitable.base.getActiveTable();
				const attachmentField = await table.getField(fieldId);
				const file = await fileFromImageURL(url, settings.current.current_recordId, selectedImageIndex);
				await attachmentField.setValue(settings.current.current_recordId, [file]);
			}
		} finally {
			setIsLoadingUpload(false); // Reset loading after upload
		}
	};

	useEffect(() => {
		initTable();
		return ()=>{
			
		};
	}, []);

	const ImagesDomRadio = generatedImages.map((url:string, index: number)=>{
		return (<Radio key={index} value={index}  className='radio-card'>
            <img src={url} className='radio-card-img' />
        </Radio>);
	});

	const ImagesDomRadioGroup = generatedImages.length > 0 ? (
		<RadioGroup
			className='radio-cards'
			type='pureCard'
			defaultValue={0}
			direction='horizontal'
			aria-label="generatedImages"
			name="demo-radio-group-pureCard"
			onChange={(e) => setSelectedImageIndex(e.target.value as number)}
		>
			{ ImagesDomRadio }
		</RadioGroup>
	): undefined;

	const LoadingDom = (
		<div className='loading-con'>
			<Spin size="large" />
		</div>
	);

	const contentDom = isLoadingGenerate ? LoadingDom: ImagesDomRadioGroup;
	const step1_desc = (<>
		<p>{t('config_1')}</p>
		<p>{t('config_2')}</p>
		<p>{t('config_3')}</p>
		<p>{t('config_4')}</p>
		<p>{t('config_5')}</p>
		<p>{t('config_6')}</p>
		<p>{t('config_7')}</p>
	</>);
	const step2_desc = (<>
		<p>{t('select_column_1')}</p>
		<p>{t('select_column_2')}</p>
		<p>{t('select_column_3')}</p>
		<p>{t('select_column_4')}</p>
	</>);
	const step3_desc = (<>
		<p>{t('click_run_1')}</p>
		<p>{t('click_run_2')}</p>
		<p>{t('click_run_3')}</p>
	</>);

	return (
		<main className="main">
			<Tabs style={{ width: '100%', margin: '0' }} type="card">
				<TabPane tab={
					<span>
						<IconGlobe />
						{t('start')}
					</span>
				} itemKey='0' key='0'>
					<label>{t('field_to_save')}</label>
					<Input
						onBlur={saveSettings} 
						defaultValue={ settings.current.field_to_save }
						onChange={ (value)=> {handleSettingsChange('field_to_save', value)}}
					></Input>
					<label>{t('prompt')}</label>
					<TextArea showClear
						value={ promptText }
					/>
					{ contentDom }
					<div className="button-container">
						<Button onClick={ generate} disabled={isLoadingGenerate || isLoadingUpload} icon={isLoadingGenerate ? <IconLoading /> : null}>{t('run') }</Button>
						<Button onClick={ upload } disabled={isLoadingGenerate || isLoadingUpload || generatedImages.length==0} icon={isLoadingUpload ? <IconLoading /> : null}>{t('save') }</Button>
					</div>
				</TabPane>
				<TabPane tab={
					<span>
						<IconSetting />
						{t('settings')}
					</span>
				} itemKey='1' key='1'>
					<label>{t('server')}</label>
        			<Input onBlur={saveSettings} 
					placeholder={'0.0.0.0:8080'}
					defaultValue={ settings.current.server} onChange={ (value)=> {handleSettingsChange('server', value)}}></Input>
					<label>{t('workflow')}</label>
					<TextArea onBlur={saveSettings} key='workflow_text'
						defaultValue={ settings.current.workflow }
						showClear 
						onChange={ (value)=> {handleSettingsChange('workflow', value)}}/>
					<label>{t('prompt_node')}</label>
					<Input onBlur={saveSettings} key='prompt_node'
					 	defaultValue={ settings.current.promptNode} 
					 	onChange={ (value)=> {handleSettingsChange('promptNode', value)}}></Input>
					<label>{t('output_node')}</label>
					<Input  onBlur={saveSettings} key='output_node'
						defaultValue={ settings.current.outputNode} 
						onChange={ (value)=> {handleSettingsChange('outputNode', value)}}></Input>
				</TabPane>
				<TabPane tab={
					<span>
						<IconHelpCircle />
						{t('help')}
					</span>
				} itemKey='2' key='2'>
					<label>{t('step')}</label>
					<Steps direction="vertical" type="basic" current={0} className='step' onChange={()=>{}}>
						<Steps.Step title={ t('config') } description={ step1_desc } />
						<Steps.Step title={ t('select_column') } description={ step2_desc } />
						<Steps.Step title={ t('click_run') } description={ step3_desc } />
					</Steps>
				</TabPane>
			</Tabs>
		</main>
	)
}