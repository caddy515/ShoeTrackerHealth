const fs = require('fs');
const path = require('path');

const permissionsPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'rn-apple-healthkit',
  'RCTAppleHealthKit',
  'RCTAppleHealthKit+TypesAndPermissions.m'
);
const fitnessPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'rn-apple-healthkit',
  'RCTAppleHealthKit',
  'RCTAppleHealthKit+Methods_Fitness.m'
);

if (!fs.existsSync(permissionsPath)) {
  console.log('[patch-rn-apple-healthkit] permissions target file not found, skipping');
  process.exit(0);
}

let source = fs.readFileSync(permissionsPath, 'utf8');

const readNeedle = `    // workouts
    if ([@"MindfulSession" isEqualToString: key] && systemVersion >= 10.0) {
        return [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierMindfulSession];
    } else if ([@"MindfulSession" isEqualToString: key]){
        return [HKObjectType workoutType];
    }
    
    return nil;
}`;

const readReplacement = `    // workouts
    if ([@"MindfulSession" isEqualToString: key] && systemVersion >= 10.0) {
        return [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierMindfulSession];
    } else if ([@"MindfulSession" isEqualToString: key]){
        return [HKObjectType workoutType];
    } else if ([@"Workout" isEqualToString:key]) {
        return [HKObjectType workoutType];
    }
    
    return nil;
}`;

const writeNeedle = `    // Mindfulness
    if([@"MindfulSession" isEqualToString:key]) {
        return [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierMindfulSession];
    }
    return nil;
}`;

const writeReplacement = `    // Mindfulness
    if([@"MindfulSession" isEqualToString:key]) {
        return [HKObjectType categoryTypeForIdentifier:HKCategoryTypeIdentifierMindfulSession];
    } else if([@"Workout" isEqualToString:key]) {
        return [HKObjectType workoutType];
    }
    return nil;
}`;

if (!source.includes('[@"Workout" isEqualToString:key]') && source.includes(readNeedle)) {
  source = source.replace(readNeedle, readReplacement);
}

if (!source.includes('return [HKObjectType workoutType];\n    }\n    return nil;') && source.includes(writeNeedle)) {
  source = source.replace(writeNeedle, writeReplacement);
}

fs.writeFileSync(permissionsPath, source);

if (fs.existsSync(fitnessPath)) {
  let fitnessSource = fs.readFileSync(fitnessPath, 'utf8');
  const healthStoreOriginal = `- (void)fitness_getSamples:(NSDictionary *)input callback:(RCTResponseSenderBlock)callback
{
    HKUnit *unit = [RCTAppleHealthKit hkUnitFromOptions:input key:@"unit" withDefault:[HKUnit countUnit]];`;
  const healthStoreReplacement = `- (void)fitness_getSamples:(NSDictionary *)input callback:(RCTResponseSenderBlock)callback
{
    if (self.healthStore == nil) {
        self.healthStore = [[HKHealthStore alloc] init];
    }

    HKUnit *unit = [RCTAppleHealthKit hkUnitFromOptions:input key:@"unit" withDefault:[HKUnit countUnit]];`;

  if (!fitnessSource.includes('if (self.healthStore == nil)') && fitnessSource.includes(healthStoreOriginal)) {
    fitnessSource = fitnessSource.replace(healthStoreOriginal, healthStoreReplacement);
    fs.writeFileSync(fitnessPath, fitnessSource);
  }
} else {
  console.log('[patch-rn-apple-healthkit] fitness target file not found, skipping');
}

console.log('[patch-rn-apple-healthkit] workout permission patch applied');
