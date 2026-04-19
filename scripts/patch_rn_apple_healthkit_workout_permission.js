const fs = require('fs');
const path = require('path');

const targetPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'rn-apple-healthkit',
  'RCTAppleHealthKit',
  'RCTAppleHealthKit+TypesAndPermissions.m'
);

if (!fs.existsSync(targetPath)) {
  console.log('[patch-rn-apple-healthkit] target file not found, skipping');
  process.exit(0);
}

let source = fs.readFileSync(targetPath, 'utf8');

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

fs.writeFileSync(targetPath, source);
console.log('[patch-rn-apple-healthkit] workout permission patch applied');
