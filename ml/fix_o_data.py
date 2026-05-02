import pandas as pd
import numpy as np
import os

STATIC_DATA_DIR = os.path.join(os.path.dirname(__file__), 'data', 'static')
csv_path = os.path.join(STATIC_DATA_DIR, 'landmarks.csv')

def generate_O_sample(noise_level=0.015):
    lm = np.zeros((21, 3))
    
    lm[0] = [0.0, 0.0, 0.0] 
    lm[1] = [-0.05, -0.05, 0.0]
    lm[2] = [-0.1, -0.1, -0.05]
    lm[5] = [0.05, -0.15, -0.05]
    lm[9] = [0.0, -0.16, -0.06]
    lm[13] = [-0.05, -0.15, -0.07]
    lm[17] = [-0.1, -0.13, -0.08]
    
    lm[3] = [-0.05, -0.2, -0.1]
    lm[4] = [0.0, -0.25, -0.15] 
    
    lm[6] = [0.05, -0.25, -0.1]
    lm[7] = [0.05, -0.3, -0.15]
    lm[8] = [0.0, -0.25, -0.15] 
    
    lm[10] = [0.0, -0.26, -0.1]
    lm[11] = [0.0, -0.31, -0.15]
    lm[12] = [0.0, -0.25, -0.15] 
    
    lm[14] = [-0.05, -0.25, -0.1]
    lm[15] = [-0.05, -0.3, -0.15]
    lm[16] = [0.0, -0.25, -0.15] 
    
    lm[18] = [-0.1, -0.23, -0.1]
    lm[19] = [-0.1, -0.28, -0.15]
    lm[20] = [0.0, -0.25, -0.15] 
    
    lm += np.random.normal(0, noise_level, lm.shape)
    return ['O'] + lm.flatten().tolist()

print("Loading dataset...")
df = pd.read_csv(csv_path, low_memory=False)

# Remove any rows where z20 is 'O'
df = df[df['z20'] != 'O']
# Remove any existing valid 'O' rows
df = df[df['label'] != 'O']

print("Generating new O samples...")
new_O_samples = []
for _ in range(5000):
    new_O_samples.append(generate_O_sample())

columns = list(df.columns)
new_df = pd.DataFrame(new_O_samples, columns=columns)

df = pd.concat([df, new_df], ignore_index=True)
print(f"New shape: {df.shape}")

df.to_csv(csv_path, index=False)
print("Saved fixed O data to landmarks.csv")
