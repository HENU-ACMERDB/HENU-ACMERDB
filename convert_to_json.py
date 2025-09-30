import pandas as pd
import json
import numpy as np
import datetime
from pypinyin import lazy_pinyin, Style

# 自定义JSON编码器，处理time对象
class TimeEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime.time):
            return obj.strftime('%H:%M:%S')
        return json.JSONEncoder.default(self, obj)

# --- 配置 ---
EXCEL_FILE_PATH = 'HENU-ACMERDB.xlsx'
RECORDS_SHEET_NAME = '工作表1'
MILESTONES_SHEET_NAME = '大事记'
RECORDS_JSON_PATH = 'records.json'
MILESTONES_JSON_PATH = 'milestones.json'

import re

# --- 辅助函数：提取中文名字的拼音首字母 --- 
def get_first_letter(name):
    try:
        # 使用pypinyin获取每个汉字的首字母
        first_letters = lazy_pinyin(name, style=Style.FIRST_LETTER)
        # 合并并转为大写
        return ''.join(first_letters).upper()
    except Exception as e:
        print(f"获取名字 '{name}' 的拼音首字母时出错: {e}")
        # 出错时回退到只获取第一个字符的首字母
        if name and len(name) > 0:
            return name[0].upper()
        return ''

# --- 辅助函数：清理和格式化数据 ---
def process_dataframe(df):
    processed_records = []
    current_season = ""  # 用于跟踪当前赛季
    
    # 遍历Excel的每一行
    for index, row in df.iterrows():
        # 检查是否为赛季标题行（首先检查所有非空单元格）
        # 使用更宽松的匹配方式
        season_found = False
        for col in df.columns:
            if not pd.isna(row[col]):
                cell_value = str(row[col]).strip()
                # 查找包含'赛季'的单元格
                if '赛季' in cell_value:
                    # 尝试提取数字赛季
                    season_match = re.search(r'(\d+)赛季', cell_value)
                    if season_match:
                        season_number = season_match.group(1)
                        current_season = f'[{season_number}]赛季'
                    else:
                        current_season = cell_value
                    print(f"找到赛季标记: {current_season} 在第 {index+1} 行，{col} 列")
                    season_found = True
                    break
        
        # 如果是赛季标题行，跳过此行数据处理
        if season_found:
            continue
        
        # 检查是否为空行（没有比赛名称）
        if pd.isna(row['比赛名称']):
            continue

        # 处理可能为空的队伍成员列
        members_str = row['队伍成员']
        if pd.isna(members_str) or str(members_str).strip() == '-':
            # 处理个人赛情况，例如百度之星
            # 这里假设个人赛没有明确的成员名单，我们需要找到选手名字
            # 根据现有数据，百度之星的队伍成员列是 '-'，需要找到一个包含选手名的列
            # 这是一个需要根据实际数据调整的假设。如果个人赛选手名在别处，需修改。
            # 暂定如果队伍成员为空，则该记录为个人赛，我们跳过拆分。
            members = []
        else:
            # 清理并拆分成员名字
            members = [name.strip() for name in str(members_str).replace('，', ',').split(',') if name.strip()]
        
        # 处理日期字段
        date_str = ''
        if pd.notna(row['比赛时间']):
            try:
                date_str = pd.to_datetime(row['比赛时间']).strftime('%Y-%m-%d')
            except:
                # 如果无法解析为日期，则保留原始字符串
                date_str = str(row['比赛时间'])
        
        # 基础记录信息
        base_record = {
            "date": date_str,
            "contestName": row['比赛名称'],
            "teamName": row['队伍名称'],
            "membersStr": members_str if members_str != '' else '', # 保留原始成员字符串
            "coach": row['教练'],
            "solved": int(row['通过数']) if pd.notna(row['通过数']) and row['通过数'] != '' and str(row['通过数']).replace('.', '', 1).isdigit() else -1,
            "penalty": row['罚时'],
            "rank": int(row['排名']) if pd.notna(row['排名']) and str(row['排名']).replace('.', '', 1).isdigit() else -1,
            "schoolRank": int(row['校排']) if pd.notna(row['校排']) and str(row['校排']).replace('.', '', 1).isdigit() else -1,
            "contestType": row['比赛类型'],
            "contestLevel": row['比赛级别'],
            "award": row['奖项'],
            "notes": row['备注'],
            "season": current_season  # 添加赛季字段
        }
        
        # 如果是团队赛，为每个成员生成一条记录
        if members:
            for member_name in members:
                record = base_record.copy()
                record['name'] = member_name
                # 添加拼音首字母
                record['firstLetter'] = get_first_letter(member_name)
                processed_records.append(record)
        # 如果是个人赛（或无法确定成员），可以考虑添加一条无特定'name'的记录，或根据其他列确定
        # 根据你的数据，百度之星似乎是个人赛，名字也在'队伍成员'列，所以上述逻辑依然能覆盖
        
    return processed_records

# --- 主函数 ---
def convert_data():
    # 1. 处理 '工作表1' -> records.json
    try:
        # 使用最简单的方式读取Excel，不指定额外参数
        df_records = pd.read_excel(EXCEL_FILE_PATH, sheet_name=RECORDS_SHEET_NAME)
        # 将NaN替换为空字符串
        df_records = df_records.fillna('')
        all_player_records = process_dataframe(df_records)
        
        with open(RECORDS_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(all_player_records, f, ensure_ascii=False, indent=4, cls=TimeEncoder)
        print(f"成功从 '{RECORDS_SHEET_NAME}' 生成 '{RECORDS_JSON_PATH}'，共 {len(all_player_records)} 条个人记录。")

    except Exception as e:
        print(f"处理 '{RECORDS_SHEET_NAME}' 时发生错误: {e}")

    # 2. 处理 '大事记' -> milestones.json
    try:
        # 使用最简单的方式读取Excel，不指定额外参数
        df_milestones = pd.read_excel(EXCEL_FILE_PATH, sheet_name=MILESTONES_SHEET_NAME)
        
        # 创建一个新的DataFrame来存储处理后的数据
        processed_rows = []
        current_season = ""
        
        # 遍历Excel的每一行
        for index, row in df_milestones.iterrows():
            # 检查是否为赛季标题行
            season_found = False
            for col in df_milestones.columns:
                if pd.notna(row[col]):
                    cell_value = str(row[col]).strip()
                    if '赛季' in cell_value:
                        # 尝试提取数字赛季
                        season_match = re.search(r'(\d+)赛季', cell_value)
                        if season_match:
                            season_number = season_match.group(1)
                            current_season = f'[{season_number}]赛季'
                        else:
                            current_season = cell_value
                        print(f"在大事记中找到赛季标记: {current_season} 在第 {index+1} 行，{col} 列")
                        season_found = True
                        break
            
            # 如果是赛季标题行，跳过这条记录的添加
            if season_found:
                continue
            
            # 如果是有效的比赛记录
            if pd.notna(row['比赛名称']) and str(row['比赛名称']).strip() != '':
                # 处理日期格式
                if pd.notna(row['比赛时间']):
                    try:
                        date_str = pd.to_datetime(row['比赛时间']).strftime('%Y-%m-%d')
                    except:
                        date_str = str(row['比赛时间'])
                else:
                    date_str = ''
                
                # 创建一条处理后的记录
                processed_record = {
                    "比赛时间": date_str,
                    "比赛名称": str(row['比赛名称']) if pd.notna(row['比赛名称']) else '',
                    "队伍名称": str(row['队伍名称']) if pd.notna(row['队伍名称']) else '',
                    "队伍成员": str(row['队伍成员']) if pd.notna(row['队伍成员']) else '',
                    "教练": str(row['教练']) if pd.notna(row['教练']) else '',
                    "通过数": float(row['通过数']) if pd.notna(row['通过数']) else '',
                    "罚时": row['罚时'] if pd.notna(row['罚时']) else '',
                    "排名": int(row['排名']) if pd.notna(row['排名']) and str(row['排名']).replace('.', '', 1).isdigit() else '',
                    "校排": int(row['校排']) if pd.notna(row['校排']) and str(row['校排']).replace('.', '', 1).isdigit() else '',
                    "比赛类型": str(row['比赛类型']) if pd.notna(row['比赛类型']) else '',
                    "比赛级别": str(row['比赛级别']) if pd.notna(row['比赛级别']) else '',
                    "奖项": str(row['奖项']) if pd.notna(row['奖项']) else '',
                    "备注": str(row['备注']) if pd.notna(row['备注']) else '',
                    "收录理由": str(row['收录理由']) if pd.notna(row['收录理由']) else '',
                    "season": current_season  # 添加正确的赛季字段
                }
                
                processed_rows.append(processed_record)
        
        milestones_records = processed_rows
        
        with open(MILESTONES_JSON_PATH, 'w', encoding='utf-8') as f:
            json.dump(milestones_records, f, ensure_ascii=False, indent=4, cls=TimeEncoder)
        print(f"成功从 '{MILESTONES_SHEET_NAME}' 生成 '{MILESTONES_JSON_PATH}'，共 {len(milestones_records)} 条大事记。")
        
    except Exception as e:
        print(f"处理 '{MILESTONES_SHEET_NAME}' 时发生错误: {e}")

# --- 运行脚本 ---
if __name__ == "__main__":
    convert_data()