add:
    - 页面跳转
        - [x] 补充下一页/上一页按钮，具体页面选择，单页加载多少数据功能
    - 数据表格
        - [x] 支持一个 tab 对应一个表，点击表名打开新的 tab
        - [x] 列名后面加上对应的数据类型
fix:
    - [x] 多页面添加按钮旁边有多余的滚动条

---

add:
    - 窗口管理
        - [x] 去除 Tables 上方的 Connections 区域，只保留右上角一个 Connections 添加按钮
    - 表格列表
        - [x] 添加快速筛选的 input 框，支持普通正则匹配
fix:
    - [x] 分页页码输入框有点小，调整成根据页码自动匹配宽度
edit:
    - Data 区域
        - [x] 只展示数据表格，隐藏 SQL QUERY 区域
        - [x] 把分页放到 right bottom
    - SQL 执行器
        - [x] 把 Run Query 放到单独的 tab
        - [x] Run Query Tab 上方执行 SQL，下方对应展示 SQL 执行对应数据

---

add:
    - 数据表格
        - [x] json 类型渲染成正确的 json
        - [x] 时间类型不需要展示时区
        - [x] 所有数据类型单元格均支持双击弹窗，然后在弹窗里编辑数据
fix:
    - [x] 分页页码输入框在现有基础上加点边距
    - [x] 去除 Query 旁边的 Connect

---

fix:
    - [x] 分页输入框不要出现上下箭头图标
    - 数据表格
        - [x] 时间类型不需要带上 "without time zone"，仅展示什么类型即可
        - [x] 编辑弹窗展示时，不要出现 focus 效果
        - [x] 双击编辑时，需要将数据所在行高亮
add:
    - 数据表格键盘操作（这些功能静默集成，无需明文提示）
        - [x] 编辑弹窗可以通过 esc 取消并关闭，cmd + enter 确认修改
        - [x] 支持 cmd + w 关闭当前表格 tab
        - [x] 支持 cmd + t 打开新的 Run Query tab
        - [x] 支持 cmd + r 重新查询当前表格 tab sql（类似刷新效果）
    - 数据表格
        - [x] 增加一个 filter 栏，位置在现在的 RESULTS Editable(PK: id) 所在行
        - [x] 调整 filter table 所在行与数据表格 filter 栏高度一致
        - [x] filter 栏可以选当前表的所有字段 + sql 常规比较运算符 and 关系运算符 + 待搜索输入框 + "- +" 按钮 + "Apply" 按钮
        - [x] 可以通过 "- +" 按钮快速删除/添加新的 filter，新加 filter 在前一个 filter 下叠加出现
        - [x] 可以通过 "Apply" 按钮执行最终查询 sql 语句
        - [x] 支持 cmd + f 快速定位到第一个 filter 栏（focus 效果同时光标要出现在输入框里）

---

fix:
    - 数据表格
        - [x] 时间类型的数据不需要展示时区
add:
    - 数据表格键盘操作
        - [x] 支持 ctrl + tab 切换不同的表格 tab，体验像 vscode 切换文件一样可以快速循环最近打开的文件
        - [x] 支持 cmd + p 模糊搜索表格，回车打开
    - 顶部标签栏
        - [x] 双击标签栏空白区域最大化/还原编辑器
    - 滚动条
        - ~~[ ] 滚动到极限位置（不管是左右还是上下）时，有橡皮筋效果（类似 macos 浏览器滚动体验），有弹性回弹~~

---

add:
    - 表结构
        - [x] 参考 ./1.png 和 ./2.png 实现

---

add:
    - 数据表格
        - [x] 通过数据表格直接对数据进行增、删、改

---

fix:
    - 所有交互
        - [x] 当按下 tab 时，如果是 button，会出现黄色边框，取消掉该效果
        - 数据表格
            - [x] 单击/双击某一行时，出现 focus 当前行效果
            - [x] 双击出现某一行出现修改弹窗时，focus 效果不要随着弹窗关闭而消失

---

add:
    - 数据库
        - [x] 新增查看列表、添加、删除数据库功能
    - 表
        - [x] 新增添加、删除表功能

---

edit:
    - 架构
        - [x] 遵循以下原则，调整整体架构：
            1. 简洁（Simplicity）： 去除冗余，直抵核心
            2. 解决核心问题（Solves the right problem）：设计的本质是功能的实现。
            3. 利用了自然的规律，顺应事物的本质。
            4. 遵循对称。这种对称不仅仅是左右相等，而是一种内在结构的和谐与逻辑。
            5. 好设计通常是有点丧失平衡的（敢于打破规则）。它不追求中庸的平庸，而是有一种独特的性格。
            6. 启发性：好设计通常留有余地，引发观者的联想与参与。
            7. 好设计是诚实的，它不伪装成它不是的东西。

---

add:
    - 表结构交互易用性增强
        - [x] **智能输入**: 类型输入框支持模糊匹配（输入 `va` -> 自动匹配 `varchar`，`in` -> `integer`）。
        - [x] **类型参数可视化**: 对于 `varchar(n)`, `numeric(p,s)` 等带参数类型，提供独立的 Length / Precision / Scale 输入框，避免手动输入括号格式错误。
        - [x] **区分 NULL 与空串**: 默认值输入框需明确区分未设置（NULL）和空字符串（''），并在 UI 上提供 "Set to NULL" 按钮。
        - [x] **自增主键快捷勾选**: 提供 "Auto Increment" 复选框，自动将 `int/bigint` 转为 `SERIAL/BIGSERIAL` 或 `IDENTITY` 列。
        - [x] **拖拽排序与插入**: 新建表时（编辑时不用），支持 "Insert Before/After" 操作；在 UI 层面支持列的拖拽排序（物理层可通过视图或重建表实现）。
        - [x] **枚举类型向导**: 输入 `enum` 类型时，弹出交互式弹窗管理枚举值，自动生成 `CREATE TYPE`。
        - [x] **列默认值的表达式支持**: 提供切换开关 [ "Literal" | f(Expression) ]，支持输入 `NOW()`、`gen_random_uuid()` 等 SQL 函数作为默认值，而不被加引号转义。
        - [x] **交互优化**:
            - [x] **富交互类型选择器**: 使用 Popover 替代 datalist，分组展示类型并附带说明（如 jsonb vs json）。
            - [x] **右键上下文菜单**: 支持复制列配置 (Duplicate Column)、重置修改、复制 SQL 定义。
            - [x] **实时校验**: 输入时即刻检测列名冲突、非法字符等错误。

---

add test:
    - 表结构变更场景测试
        - [x] **主键变更 (Primary Key)**:
            - [x] 从无主键表添加主键 (Add PK)。
            - [x] 删除现有主键 (Drop PK)。
            - [x] 复合主键 (Composite PK) 的创建与修改。
            - [x] 主键列重命名对约束的影响。
        - [x] **列操作 (Columns)**:
            - [x] **重命名列**: 验证重命名列后，生成的 SQL 是否正确引用旧列名 (`RENAME COLUMN "old" TO "new"`).
            - [x] **类型变更 (Type Casting)**:
                - [x] 兼容变更 (e.g., `varchar(50)` -> `varchar(100)`).
                - [x] 需显式转换变更 (e.g., `integer` -> `varchar`, `text` -> `jsonb`)，验证是否生成 `USING` 子句。
            - [x] **约束变更**:
                - [x] `NULL` -> `NOT NULL`: 测试表中存在 NULL 数据时的行为 (应报错或提示清洗数据)。
                - [x] `DEFAULT` 值变更: 验证 `DROP DEFAULT` 和 `SET DEFAULT`。
        - [x] **索引联动 (Indexes)**:
            - [x] 重命名列时，关联的索引定义是否自动更新列名。
            - [x] 删除被索引引用的列，验证是否提示级联删除索引。
        - [x] **边界与特殊情况**:
            - [x] **保留字**: 使用 SQL 保留字 (`user`, `order`, `select`) 作为列名，验证双引号引用是否正确。
            - [x] **特殊字符**: 列名包含空格、点号、Emoji 或中文，验证 DDL 生成正确性。
            - [x] **空状态**: 创建表时未定义任何列的处理。
        - [x] **日常字段变更 (Routine Column Ops)**:
            - [x] **新增状态字段**: 添加 `status` (varchar) -> 设置长度 50 -> 设置默认值 `'pending'` -> 设为 Not Null。
            - [x] **修正字段定义**: 将 `created_at` 的类型从 `date` 改为 `timestamp` (保留时间信息)。
            - [x] **扩容文本字段**: 将 `description` 从 `varchar(100)` 修改为 `text` 或 `varchar(500)` (防止截断)。
            - [x] **字段重命名**: 修正拼写错误 (e.g., `usre_id` -> `user_id`)，确保数据不丢失。
        - [x] **主键与索引优化 (PK & Performance)**:
            - [x] **切换主键策略**: 从默认的 `id` (Serial) 改为 `uuid` (UUID) 主键。
            - [x] **添加唯一索引**: 为 `email` 或 `username` 字段添加 Unique Index。
            - [x] **复合索引创建**: 为 `(first_name, last_name)` 创建复合索引以优化查询。
        - [x] **安全与预览 (Safety & Review)**:
            - [x] **多步操作预览**: 新增一列 + 删除一列 + 修改一列 -> 点击 "Preview SQL" -> 确认生成的 3 条语句逻辑正确。
            - [x] **放弃修改**: 做了多次修改但未保存 -> 直接关闭或点击刷新 -> 确认界面回滚到原始状态。
        - [x] **异常处理 (Error Handling)**:
            - [x] **非空约束冲突**: 现有数据包含 NULL -> 尝试改为 NOT NULL -> 提交 -> 验证报错提示友好 ("contains null values")。
            - [x] **类型转换失败**: 将包含 "abc" 的文本列转为 Integer -> 提交 -> 验证报错 ("invalid input syntax for type integer")。
        - [x] **默认值与表达式 (Defaults & Expressions)**:
            - [x] **布尔值默认**: `is_active` 字段设置默认值为 `true` 或 `false`。
            - [x] **时间戳自动填充**: `created_at` 字段设置默认值为 `NOW()` 或 `CURRENT_TIMESTAMP` (验证不被当做字符串加引号)。
            - [x] **JSON 初始化**: `metadata` (jsonb) 字段设置默认值为 `{}` (空对象) 或 `[]` (空数组)。
        - [x] **文档与维护 (Documentation)**:
            - [x] **字段注释**: 为核心字段添加业务含义注释 (e.g., `status`: "0=pending, 1=active")，并验证 `COMMENT ON COLUMN` 语句生成。
        - [x] **约束管理 (Constraints - High Frequency)**:
            - [x] **外键关联**: `user_id` -> 关联 `users.id` (验证类型必须一致，e.g., int vs int)。
            - [x] **级联删除**: 设置 `ON DELETE CASCADE`，验证删除父表记录时子表数据是否自动清除。
            - [x] **逻辑校验**: 添加 Check Constraint (e.g., `price >= 0`)，验证插入负数是否报错。
            - [x] **唯一性保证**: 对 `email` 或 `phone` 字段添加 Unique Constraint (非索引方式)。
        - [x] **现代 PG 特性 (Modern Best Practices)**:
            - [x] **Identity Columns**: 使用 `GENERATED BY DEFAULT AS IDENTITY` 替代传统的 `SERIAL` 类型。
            - [x] **枚举迁移**: 将 `status` (varchar) 字段转为 `TYPE status_enum` (需处理 `CREATE TYPE` 逻辑)。
        - [x] **批量操作与效率 (Efficiency)**:
            - [x] **快速复制**: 选中 `created_at` -> Duplicate -> 改名为 `updated_at` (省去重新选类型/默认值的时间)。
            - [x] **多列删除**: 勾选多个废弃字段 -> 一次性删除。
        - [x] **权限与兼容性 (Permissions & Compatibility)**:
            - [x] **只读保护**: 使用只读账号登录，验证是否禁用 "Save Changes" 按钮或明确提示权限不足。
            - [x] **未知类型兼容**: 表中包含插件类型 (e.g., `geometry`, `vector`)，验证结构编辑器能否正常加载显示（不应白屏），即使不支持编辑。

---

add test:
    - 数据表格功能测试
        - [x] **基础渲染与分页 (Rendering & Pagination)**:
            - [x] **分页状态**: 切换页码 (Page 1 -> 2) 和页大小 (100 -> 500)，验证数据正确加载且状态保持。
            - [x] **空状态**: 打开无数据的表，验证显示 "No data found" 且不报错。
            - [x] **特殊类型展示**:
                - [x] JSON/JSONB: 验证是否格式化显示。
                - [x] Timestamp: 验证是否隐藏时区信息 (e.g., `2023-01-01 12:00:00`)。
                - [x] Null: 验证 `NULL` 值显示为灰色 italic `null`。
        - [x] **数据编辑 (CRUD Operations)**:
            - [x] **行内编辑**:
                - [x] **文本/数字**: 双击修改 `varchar`/`int`，回车保存，验证数据更新成功。
                - [x] **JSON**: 双击修改 JSON 字段，输入合法 JSON 保存成功；输入非法 JSON 提示错误。
                - [x] **日期时间**: 修改 timestamp 字段，验证格式解析正确性。
                - [x] **取消修改**: 双击编辑后按 `Esc`，验证恢复原值。
            - [x] **新增行 (Add Row)**:
                - [x] **自增列跳过**: 点击 "Add Row"，验证 `id` (serial) 列被禁用/跳过。
                - [x] **必填项校验**: 不填 `NOT NULL` 字段尝试保存，验证数据库报错提示。
                - [x] **默认值**: 留空有 `DEFAULT` 值的字段，验证保存后自动填充默认值。
            - [x] **删除行 (Delete Row)**:
                - [x] **右键删除**: 右键 -> Delete Row，确认对话框 -> 确定，验证行消失。
                - [x] **无主键表**: 打开无主键 (No PK) 的表，验证无法编辑和删除（或提示）。
        - [x] **过滤与搜索 (Filtering)**:
            - [x] **基础过滤**: 添加 `status = 'active'`，Apply，验证结果集正确。
            - [x] **多条件组合**: 添加 `age > 18` AND `name LIKE '%John%'`，验证逻辑正确。
            - [x] **键盘交互**: 在 Filter 输入框按 `Enter` 触发查询。
            - [x] **动态增删**: 快速点击 "+" / "-" 按钮添加或删除过滤行，验证 UI 响应流畅。
        - [x] **快捷键 (Keyboard Shortcuts)**:
            - [x] **Cmd+F**: 聚焦到 Filter 栏第一个输入框。
            - [x] **Cmd+R**: 刷新当前表格数据。
            - [x] **Cmd+T**: 打开新的 Query Tab。
            - [x] **Cmd+W**: 关闭当前 Tab。
            - [x] **Ctrl+Tab**: 在最近打开的 Tab 间循环切换。
            - [x] **Cmd+P**: 模糊搜索表名并打开。

---

add test:
    - 多标签页与窗口管理
        - [x] **状态隔离**: 打开同一个表的两个 Tab，在 Tab A 设置过滤条件，验证 Tab B 不受影响。
        - [x] **Tab 循环切换**: 打开 3 个 Tab，使用 `Ctrl+Tab` 验证是否按照“最近使用 (MRU)” 顺序切换，而非单纯的从左到右。
        - [x] **最大化/还原**: 双击 Tab 标题栏空白处，验证编辑器区域是否最大化（侧边栏隐藏）；再次双击还原。
        - [x] **关闭策略**:
            - [x] **关闭当前**: 验证关闭 Active Tab 后，焦点自动跳转到上一个最近使用的 Tab。
            - [x] **关闭所有**: 依次关闭所有 Tab，验证显示 "Select a table..." 空状态页。

---

add test:
    - SQL 执行器 (SQL Query Runner)
        - [x] **基础执行**:
            - [x] 输入 `SELECT 1`，运行，验证下方结果栏显示 `1`。
            - [x] 输入错误 SQL (e.g., `SELEC *`), 运行，验证显示红色错误提示框。
        - [x] **快捷键**: 在 SQL 编辑器内按 `Cmd+Enter`，验证触发表格查询。
        - [x] **多语句支持**: 输入多条 SQL (`;` 分隔)，验证是否仅执行选中的语句。

---

edit:
    - 侧边栏
        - [ ] 可以通过拖拽调整宽度
        - [ ] 将侧边栏元素与数据表格之间的分割线边距设为 0
        - 将 Schema 下拉选择器替换为与数据库下拉相同的组件，保持交互和样式一致
    - 窗口管理
        - [ ] 窗口名称改成当前连接的库
    - 表结构新建页
        - [ ] 调整顶部边距，避免与"双击标签栏空白区域最大化"功能触发区重叠
        - [ ] 将"新建页"改为 Tab 形式展示，与"数据表格"、"Query"等 Tab 并列，移除返回按钮
    - 表结构编辑页
        - [ ] 表结构的 name 列宽度太小，调大表结构 name 列的宽度
        - [ ] 添加索引时，columns 从 input 改成 checkbox 并允许多选
        - [ ] 移除返回按钮
    - 数据表格
        - [ ] filter 栏独占一行，宽度 100%
        - [ ] 取消 Apply 按钮，回车直接应用 filter
        - 取消 Query 按钮，保持Cmd+T 打开新的 Query Tab 即可
        - 数据表格右键菜单
            - [ ] 取消 + Add Row 按钮，通过数据表格右键菜单实现添加行功能
            - [ ] 统一右键菜单：选中行时显示删除（添加置灰），选中空白处时显示添加（删除置灰）
    - 支持选中复制
        - [ ] 数据表格：列名
        - [ ] 添加表/编辑表：Columns、Indexes、Name 等字段标签
