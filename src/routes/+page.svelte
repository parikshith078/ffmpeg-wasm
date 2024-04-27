<script lang="ts">
	import { tweened } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { confetti } from '@neoconfetti/svelte';
	import { FFmpeg } from '@ffmpeg/ffmpeg';
	import { onMount } from 'svelte';

	type State = 'loading' | 'loaded' | 'convert.start' | 'convert.error' | 'convert.done';

	let state: State = 'loading';
	let error = '';
	let ffmpeg: FFmpeg;
	let progress = tweened(0);

	async function readFile(file: File): Promise<Uint8Array> {
		return new Promise((resolve) => {
			const fileReader = new FileReader();

			fileReader.onload = () => {
				const { result } = fileReader;
				if (result instanceof ArrayBuffer) {
					resolve(new Uint8Array(result));
				}
			};

			fileReader.onerror = () => {
				error = 'Could not read file';
			};

			fileReader.readAsArrayBuffer(file);
		});
	}

	async function convertVidoe(vidoe: File) {
		state = 'convert.start';
		const vidoeData = await readFile(vidoe);

		await ffmpeg.writeFile('input.webm', vidoeData);
		await ffmpeg.exec(['-i', 'input.webm', 'output.mp4']);
		const data = await ffmpeg.readFile('output.mp4');
		state = 'convert.done';
		return data as Uint8Array;
	}

	async function loadFFmpeg() {
		const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';

		ffmpeg = new FFmpeg();

		ffmpeg.on('progress', (event) => {
			$progress = event.progress * 100;
		});
		await ffmpeg.load({
			coreURL: `${baseURL}/ffmpeg-core.js`,
			wasmURL: `${baseURL}/ffmpeg-core.wasm`
		});

		state = 'loaded';
	}

	function downloadVidoe(data: Uint8Array) {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([data.buffer], { type: 'vidoe/mp4' }));
		a.download = 'outpu.mp4';
		setTimeout(() => {
			a.click();
		}, 1000);
	}

	async function handleDrop(event: DragEvent) {
		console.log('draged');
		if (!event.dataTransfer) return;

		if (event.dataTransfer.files.length > 1) {
			error = 'Upload one file';
		}

		if (event.dataTransfer.files[0].type == 'video/webm') {
			error = '';
			const [file] = event.dataTransfer.files;
			console.log('converting...');
			const data = await convertVidoe(file);
			downloadVidoe(data);
		} else {
			error = 'Only WebM is supported';
		}
	}
	$: console.log(state);

	onMount(() => {
		loadFFmpeg();
	});
</script>

<h1 class="title">WebM to MP4 Converter</h1>
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
	on:drop|preventDefault={handleDrop}
	data-state={state}
	on:dragover|preventDefault={() => {}}
	class="drop"
>
	{#if state == 'loading'}
		<p in:fade>Loading FFmeg...</p>
	{/if}

	{#if state == 'loaded'}
		<p in:fade>Drag vidoe here</p>
	{/if}

	{#if state == 'convert.start'}
		<p in:fade>Converting video</p>

		<div class="progress-bar">
			<div class="progress" style:--progress="{$progress}%">
				{$progress.toFixed(0)}%
			</div>
		</div>
	{/if}

	{#if state == 'convert.done'}
		<div use:confetti />
		<p in:fade>Done! 🎉</p>
	{/if}

	{#if error}
		<p in:fade class="error">{error}</p>
	{/if}
</div>

<style>
	.title {
		text-align: center;
	}

	.drop {
		width: 600px;
		height: 400px;
		margin: 0 auto;
		display: grid;
		place-content: center;
		margin-block-start: 2rem;
		border: 10px dashed hsl(220, 10%, 20%);
		border-radius: 8px;

		& p {
			font-size: 2rem;
			text-align: center;

			&.error {
				color: hsl(9, 100%, 64%);
			}
		}
	}

	.progress-bar {
		--progress-bar-clr: hsl(180 100% 50%);
		--progress-txt-clr: hsl(0 0% 0%);

		width: 300px;
		height: 40px;
		position: relative;
		font-weight: 700;
		background-color: hsl(200, 10%, 14%);
		border-radius: 8px;

		& .progress {
			width: var(--progress);
			height: 100%;
			position: absolute;
			left: 0px;
			display: grid;
			place-content: center;
			background: var(--progress-bar-clr);
			color: var(--progress-txt-clr);
			border-radius: 8px;
		}
	}
</style>
