import React from 'react';
import { Collection } from 'cbl-reactnative';
import CBLCollectionActionContainer from '@/components/CBLCollectionActionContainer/CBLCollectionActionContainer';

export default function CollectionFullNameTestScreen() {
  function reset() {}

  async function update(collection: Collection): Promise<string[]> {
    const results: string[] = [];
    
    try {
      // Test 1: Get fullName from existing collection
      results.push('=== TEST 1: Get Full Name ===');
      const fullName = await collection.fullName();
      results.push(`✅ SUCCESS: Full Name = "${fullName}"`);
      results.push(`   Collection Name: ${collection.name}`);
      results.push(`   Scope Name: ${collection.scope.name}`);
      results.push(`   Database: ${collection.database.getName()}`);
      
      // Test 2: Verify format is correct
      results.push('');
      results.push('=== TEST 2: Verify Format ===');
      const expectedFormat = `${collection.scope.name}.${collection.name}`;
      if (fullName === expectedFormat) {
        results.push(`✅ Format matches: "${fullName}"`);
      } else {
        results.push(`❌ Format mismatch!`);
        results.push(`   Expected: "${expectedFormat}"`);
        results.push(`   Got: "${fullName}"`);
      }
      
      // Test 3: Verify fullName succeeds with valid collection
      results.push('');
      results.push('=== TEST 3: Validate Success Case ===');
      results.push('Testing with valid collection (should succeed)');
      try {
        const testFullName = await collection.fullName();
        results.push(`✅ No error thrown for valid collection`);
        results.push(`   Got: "${testFullName}"`);
      } catch (error: any) {
        results.push(`❌ Unexpected error: ${error.message}`);
        results.push(`   Code: ${error.code || 'N/A'}`);
      }
      
      // Test 4: Compare with old computed method
      results.push('');
      results.push('=== TEST 4: Compare Old vs New ===');
      const fullNameNew = await collection.fullName();
      const fullNameOld = `${collection.scope.name}.${collection.name}`;
      if (fullNameNew === fullNameOld) {
        results.push(`✅ Both methods return same result`);
        results.push(`   New (native): "${fullNameNew}"`);
        results.push(`   Old (computed): "${fullNameOld}"`);
      } else {
        results.push(`⚠️ Results differ!`);
        results.push(`   New (native): "${fullNameNew}"`);
        results.push(`   Old (computed): "${fullNameOld}"`);
      }
      
    } catch (error: any) {
      results.push('');
      results.push('=== ❌ ERROR OCCURRED ===');
      results.push(`Message: ${error.message || 'Unknown error'}`);
      results.push(`Code: ${error.code || 'N/A'}`);
      results.push(`Type: ${error.constructor.name}`);
      
      // Check if error has expected properties
      if (error.message) {
        results.push('✅ Error has .message property');
      } else {
        results.push('❌ Error missing .message property');
      }
      
      // Log full error for debugging
      results.push('');
      results.push('Full error object:');
      results.push(JSON.stringify(error, null, 2));
    }
    
    return results;
  }

  return (
    <CBLCollectionActionContainer
      handleUpdatePressed={update}
      handleResetPressed={reset}
      screenTitle="Test Collection FullName"
    />
  );
}

