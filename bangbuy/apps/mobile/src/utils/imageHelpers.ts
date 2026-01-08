import * as ImageManipulator from 'expo-image-manipulator';
import { Alert } from 'react-native';

export const normalizeImagesToJpg = async (assets: any[]) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/utils/imageHelpers.ts:4',message:'normalizeImagesToJpg called',data:{assetsCount:assets?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  if (!assets || assets.length === 0) return [];
  try {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/utils/imageHelpers.ts:8',message:'Before ImageManipulator.manipulateAsync',data:{assetsCount:assets.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    const processedResults = await Promise.all(
      assets.map(async (asset, index) => {
        try {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/utils/imageHelpers.ts:12',message:'Calling ImageManipulator.manipulateAsync',data:{index,assetUri:asset?.uri?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          const result = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 2048 } }], 
            { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
          );
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/utils/imageHelpers.ts:18',message:'ImageManipulator.manipulateAsync success',data:{index,resultUri:result?.uri?.substring(0,50)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          return {
            ...asset,
            uri: result.uri,
            width: result.width,
            height: result.height,
            type: 'image/jpeg',
            name: `photo_${Date.now()}_${index}.jpg`,
            fileSize: undefined,
          };
        } catch (error) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/0543bbaa-340a-41c2-b5c3-e4c523fe1030',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'src/utils/imageHelpers.ts:25',message:'ImageManipulator.manipulateAsync error',data:{index,errorMessage:error instanceof Error?error.message:'unknown',errorName:error?.constructor?.name,isNativeModuleError:error instanceof Error&&error.message?.includes('native module')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
          // #endregion
          console.warn('Image conversion failed:', error);
          return null;
        }
      })
    );
    const validImages = processedResults.filter((item) => item !== null);
    if (validImages.length < assets.length) {
      Alert.alert('Notice', 'Some photos could not be processed and were skipped.');
    }
    return validImages;
  } catch (e) {
    console.error('Batch processing failed:', e);
    Alert.alert('Error', 'Failed to process photos.');
    return [];
  }
};

